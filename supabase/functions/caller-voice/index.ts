// Voz con IA del cantador (FEAT-55, US A6). Tres acciones, porque generar una lotería entera no cabe
// en el tiempo de una sola llamada:
//   start    — cobra 10 tokens y guarda la voz escogida (start_caller_voice).
//   generate — genera con ElevenLabs (decisión 29), sin costo, el audio de una carta (o de la frase de arranque)
//              de una lotería pagada;
//              si ya existe con el mismo título, no hace nada (decisión 15).
//   refund   — devuelve los 10 tokens si no salió ninguna carta (refund_caller_voice).
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { buildCorsHeaders, parseAllowedOrigins } from '../_shared/cors.ts';
import {
  audioPath, buildSpeechRequest, callText, CALLER_INTRO_TEXT, type CallerVoiceId, INTRO_ID, mapCallerVoiceError, needsAudio,
  parseCallerVoiceRequest, toCallerVoiceErrorResponse,
} from '../_shared/callerVoice.ts';

const AUDIO_BUCKET = 'caller-audio';
/** Lo más que se espera a ElevenLabs por un título. */
const SPEECH_TIMEOUT_MS = 30_000;
/** Reintentos cuando ElevenLabs está ocupado (429: el plan limita las peticiones simultáneas). */
const BUSY_RETRIES = 3;
const BUSY_WAIT_MS = 2000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Dice el texto con ElevenLabs y devuelve el MP3. Lanza AI_BUSY si sigue ocupado, AI_TIMEOUT si tarda. */
async function speak(apiKey: string, text: string, voiceId: CallerVoiceId): Promise<ArrayBuffer> {
  const request = buildSpeechRequest(text, voiceId);
  for (let attempt = 0; attempt <= BUSY_RETRIES; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SPEECH_TIMEOUT_MS);
    try {
      const res = await fetch(request.url, {
        method: 'POST',
        headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
        body: JSON.stringify(request.body),
        signal: controller.signal,
      });
      if (res.ok) return await res.arrayBuffer();
      const detail = await res.text().catch(() => '');
      if (res.status !== 429) throw new Error(`ElevenLabs (${res.status}): ${detail.slice(0, 300)}`);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') throw new Error('AI_TIMEOUT');
      throw err;
    } finally {
      clearTimeout(timer);
    }
    await sleep(BUSY_WAIT_MS * (attempt + 1));
  }
  throw new Error('AI_BUSY');
}

async function generate(
  admin: SupabaseClient, elevenLabsKey: string, userId: string, setId: string, cardId: string,
): Promise<'generated' | 'exists'> {
  const { data: voice, error: voiceError } = await admin.from('caller_voices')
    .select('voice_id, intro_path').eq('set_id', setId).eq('user_id', userId).maybeSingle();
  if (voiceError) throw new Error(`caller_voices: ${voiceError.message}`);
  if (!voice) throw new Error('VOICE_NOT_PAID');

  const path = audioPath(userId, setId, cardId);
  let text = CALLER_INTRO_TEXT;
  if (cardId === INTRO_ID) {
    if (voice.intro_path) return 'exists';
  } else {
    const { data: card, error: cardError } = await admin.from('cards')
      .select('title').eq('id', cardId).eq('set_id', setId).eq('user_id', userId).maybeSingle();
    if (cardError) throw new Error(`cards: ${cardError.message}`);
    if (!card) throw new Error('CARD_NOT_FOUND');
    const { data: audio } = await admin.from('caller_audios').select('title').eq('card_id', cardId).maybeSingle();
    if (!needsAudio(audio?.title ?? null, card.title)) return 'exists';
    text = card.title;
  }

  const mp3 = await speak(elevenLabsKey, callText(text), voice.voice_id as CallerVoiceId);
  const { error: uploadError } = await admin.storage.from(AUDIO_BUCKET)
    .upload(path, mp3, { contentType: 'audio/mpeg', upsert: true });
  if (uploadError) throw new Error(`subida del audio: ${uploadError.message}`);

  const { error: saveError } = cardId === INTRO_ID
    ? await admin.from('caller_voices').update({ intro_path: path }).eq('set_id', setId)
    : await admin.from('caller_audios').upsert({ card_id: cardId, set_id: setId, user_id: userId, title: text, path });
  if (saveError) throw new Error(`registro del audio: ${saveError.message}`);
  return 'generated';
}

async function refund(admin: SupabaseClient, userId: string, setId: string): Promise<void> {
  const { data: voice } = await admin.from('caller_voices')
    .select('set_id').eq('set_id', setId).eq('user_id', userId).maybeSingle();
  if (!voice) return; // ya devuelta, o no es suya
  const { error } = await admin.rpc('refund_caller_voice', { p_set_id: setId });
  if (error) throw mapCallerVoiceError(error.message);
}

Deno.serve(async (req) => {
  const headers = buildCorsHeaders(req.headers.get('Origin'), parseAllowedOrigins(Deno.env.get('ALLOWED_ORIGINS')));
  const reply = (status: number, body: Record<string, unknown>) =>
    new Response(JSON.stringify(body), { status, headers });

  if (req.method === 'OPTIONS') return new Response('ok', { headers });
  if (req.method !== 'POST') return reply(405, { error: 'INVALID_REQUEST', message: 'Método no permitido.' });

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY');
  const elevenLabsKey = Deno.env.get('ELEVENLABS_API_KEY');
  if (!serviceRoleKey || !elevenLabsKey) {
    console.error('caller-voice: falta SERVICE_ROLE_KEY o ELEVENLABS_API_KEY');
    return reply(500, { error: 'CONFIG_ERROR', message: 'Servicio de IA no configurado.' });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return reply(401, { error: 'NOT_LOGGED_IN', message: 'Se requiere autenticación.' });
  }
  const { data: { user }, error: userError } = await createClient(supabaseUrl, anonKey)
    .auth.getUser(authHeader.replace('Bearer ', '').trim());
  if (userError || !user) {
    return reply(401, { error: 'NOT_LOGGED_IN', message: 'Sesión inválida o expirada.' });
  }

  const parsed = parseCallerVoiceRequest(await req.json().catch(() => null));
  if (!parsed.ok) return reply(400, { error: 'INVALID_REQUEST', message: parsed.message });
  const request = parsed.value;

  const admin = createClient(supabaseUrl, serviceRoleKey);

  try {
    switch (request.action) {
      case 'start': {
        const { error } = await admin.rpc('start_caller_voice', {
          p_user_id: user.id, p_set_id: request.setId, p_voice_id: request.voiceId,
        });
        if (error) throw mapCallerVoiceError(error.message);
        return reply(200, { status: 'charged' });
      }
      case 'generate':
        return reply(200, { status: await generate(admin, elevenLabsKey, user.id, request.setId, request.cardId) });
      case 'refund':
        await refund(admin, user.id, request.setId);
        return reply(200, { status: 'refunded' });
    }
  } catch (err) {
    const response = toCallerVoiceErrorResponse(err);
    if (response.internal) console.error('caller-voice:', err);
    return reply(response.status, response.body);
  }
});
