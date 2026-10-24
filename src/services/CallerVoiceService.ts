import { supabase } from '../utils/supabaseClient';
import { INTRO_AUDIO_ID } from '../utils/callerAiVoice';
import { logger } from '../utils/logger';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';
const AUDIO_BUCKET = 'caller-audio';
/** Lo que duran los enlaces a los audios: una tarde de fiesta. */
const AUDIO_LINK_SECONDS = 6 * 60 * 60;

export interface CallerVoiceState {
  voiceId: string;
  hasIntro: boolean;
  /** carta → título con el que se generó su audio */
  audioTitles: Map<string, string>;
  /** carta (o «intro») → enlace firmado al audio */
  urls: Map<string, string>;
}

type CallerVoiceBody =
  | { action: 'start'; set_id: string; voice_id: string }
  | { action: 'generate'; set_id: string; card_id: string }
  | { action: 'refund'; set_id: string };

/**
 * Llama a la edge function caller-voice. Rechaza con un Error cuyo message es el código del servidor
 * (NOT_LOGGED_IN, INSUFFICIENT_TOKENS, VOICE_ALREADY_CREATED, AI_BUSY, AI_TIMEOUT, AI_ERROR…).
 */
async function call(body: CallerVoiceBody): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('NOT_LOGGED_IN');
  const res = await fetch(`${SUPABASE_URL}/functions/v1/caller-voice`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(body),
  });
  if (res.ok) return;
  const json = await res.json().catch(() => ({}));
  if (res.status === 401) throw new Error('NOT_LOGGED_IN');
  throw new Error(typeof json.error === 'string' ? json.error : 'AI_ERROR');
}

export const CallerVoiceService = {
  /**
   * Borra los audios con voz de IA de una carta, o de toda la lotería si no se da carta. Las filas de los
   * audios se borran solas con la carta o la lotería; los archivos no, por eso se borran aquí, como las fotos.
   * No lanza: si falla, la carta o la lotería ya están borradas.
   */
  async removeAudios(userId: string, setId: string, cardId?: string): Promise<void> {
    const folder = `${userId}/${setId}`;
    try {
      let paths = cardId ? [`${folder}/${cardId}.mp3`] : [];
      if (!cardId) {
        const { data, error } = await supabase.storage.from(AUDIO_BUCKET).list(folder, { limit: 1000 });
        if (error) throw error;
        paths = (data ?? []).map((file) => `${folder}/${file.name}`);
      }
      if (paths.length === 0) return;
      const { error } = await supabase.storage.from(AUDIO_BUCKET).remove(paths);
      if (error) throw error;
    } catch (err) {
      logger.warn('Could not remove caller voice audios:', err);
    }
  },

  /** Cobra la voz con IA de la lotería (10 tokens, una sola vez). */
  start: (setId: string, voiceId: string) => call({ action: 'start', set_id: setId, voice_id: voiceId }),

  /** Genera, sin costo, el audio de una carta o de la frase de arranque. */
  generate: (setId: string, cardId: string) => call({ action: 'generate', set_id: setId, card_id: cardId }),

  /** Pide de vuelta los tokens si no salió ninguna carta. */
  refund: (setId: string) => call({ action: 'refund', set_id: setId }),

  /** La voz con IA de la lotería y sus audios, o null si no la tiene. */
  async load(setId: string): Promise<CallerVoiceState | null> {
    const { data: voice, error: voiceError } = await supabase
      .from('caller_voices')
      .select('voice_id, intro_path')
      .eq('set_id', setId)
      .maybeSingle();
    if (voiceError) throw voiceError;
    if (!voice) return null;

    const { data: audios, error: audiosError } = await supabase
      .from('caller_audios')
      .select('card_id, title, path')
      .eq('set_id', setId);
    if (audiosError) throw audiosError;

    const paths = new Map<string, string>((audios ?? []).map((a) => [a.card_id as string, a.path as string]));
    if (voice.intro_path) paths.set(INTRO_AUDIO_ID, voice.intro_path as string);

    const urls = new Map<string, string>();
    if (paths.size > 0) {
      const ids = [...paths.keys()];
      const { data: signed, error: signError } = await supabase.storage
        .from(AUDIO_BUCKET)
        .createSignedUrls(ids.map((id) => paths.get(id) as string), AUDIO_LINK_SECONDS);
      if (signError) throw signError;
      (signed ?? []).forEach((s, i) => {
        if (s.signedUrl) urls.set(ids[i], s.signedUrl);
      });
    }

    return {
      voiceId: voice.voice_id as string,
      hasIntro: Boolean(voice.intro_path),
      audioTitles: new Map((audios ?? []).map((a) => [a.card_id as string, a.title as string])),
      urls,
    };
  },
};
