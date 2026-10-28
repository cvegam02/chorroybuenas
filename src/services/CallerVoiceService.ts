import { supabase } from '../utils/supabaseClient';
import { INTRO_AUDIO_ID } from '../utils/callerAiVoice';
import { logger } from '../utils/logger';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';
const AUDIO_BUCKET = 'caller-audio';
/** Lo que duran los enlaces a los audios: una tarde de fiesta. */
const AUDIO_LINK_SECONDS = 6 * 60 * 60;
/** Lo más que Storage lista o borra en una sola llamada. */
const STORAGE_PAGE = 1000;

export interface CallerVoiceState {
  voiceId: string;
  hasIntro: boolean;
  /** Cartas que cubre lo pagado (FEAT-58, decisión 8). */
  coveredCards: number;
  /** carta → título con el que se generó su audio */
  audioTitles: Map<string, string>;
  /** carta (o «intro») → enlace firmado al audio */
  urls: Map<string, string>;
}

type CallerVoiceBody =
  | { action: 'start'; set_id: string; voice_id: string }
  | { action: 'generate'; set_id: string; card_id: string }
  | { action: 'expand'; set_id: string }
  | { action: 'refund'; set_id: string };

/**
 * Llama a la edge function caller-voice. Rechaza con un Error cuyo message es el código del servidor
 * (NOT_LOGGED_IN, INSUFFICIENT_TOKENS, VOICE_ALREADY_CREATED, VOICE_UNAVAILABLE, AI_BUSY, AI_TIMEOUT, AI_ERROR…).
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

/** Todos los archivos de una carpeta del bucket de audios, leídos en páginas. */
async function listAudioPaths(folder: string): Promise<string[]> {
  const paths: string[] = [];
  for (let offset = 0; ; offset += STORAGE_PAGE) {
    const { data, error } = await supabase.storage.from(AUDIO_BUCKET).list(folder, { limit: STORAGE_PAGE, offset });
    if (error) throw error;
    const page = data ?? [];
    paths.push(...page.map((file) => `${folder}/${file.name}`));
    if (page.length < STORAGE_PAGE) return paths;
  }
}

export const CallerVoiceService = {
  /**
   * Borra los audios con voz de IA de una carta (o de varias), o de toda la lotería si no se da carta. Las filas
   * de los audios se borran solas con la carta o la lotería; los archivos no, por eso se borran aquí, como las
   * fotos. No lanza: si falla, la carta o la lotería ya están borradas.
   */
  async removeAudios(userId: string, setId: string, cardIds?: string | readonly string[]): Promise<void> {
    const folder = `${userId}/${setId}`;
    try {
      const paths = cardIds === undefined
        ? await listAudioPaths(folder)
        : (typeof cardIds === 'string' ? [cardIds] : cardIds).map((id) => `${folder}/${id}.mp3`);
      // En páginas: una lotería puede tener más audios de los que Storage borra de una vez (FEAT-58, H20).
      for (let start = 0; start < paths.length; start += STORAGE_PAGE) {
        const { error } = await supabase.storage.from(AUDIO_BUCKET).remove(paths.slice(start, start + STORAGE_PAGE));
        if (error) throw error;
      }
    } catch (err) {
      logger.warn('Could not remove caller voice audios:', err);
    }
  },

  /** Cobra la voz con IA de la lotería según sus cartas (10 tokens hasta 60 y 2 por cada 10 más). */
  start: (setId: string, voiceId: string) => call({ action: 'start', set_id: setId, voice_id: voiceId }),

  /** Genera, sin costo, el audio de una carta o de la frase de arranque. */
  generate: (setId: string, cardId: string) => call({ action: 'generate', set_id: setId, card_id: cardId }),

  /** «Ampliar la voz»: cobra los bloques de cartas que pasan de lo pagado (FEAT-58, decisión 8). */
  expand: (setId: string) => call({ action: 'expand', set_id: setId }),

  /** Pide de vuelta los tokens si no salió ninguna carta ni la frase de arranque. */
  refund: (setId: string) => call({ action: 'refund', set_id: setId }),

  /** La voz con IA de la lotería y sus audios, o null si no la tiene. */
  async load(setId: string): Promise<CallerVoiceState | null> {
    const { data: voice, error: voiceError } = await supabase
      .from('caller_voices')
      .select('voice_id, intro_path, covered_cards')
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
      coveredCards: voice.covered_cards as number,
      audioTitles: new Map((audios ?? []).map((a) => [a.card_id as string, a.title as string])),
      urls,
    };
  },
};
