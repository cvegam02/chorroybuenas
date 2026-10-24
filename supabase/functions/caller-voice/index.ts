// Voz con IA del cantador (FEAT-55, US A6). Tres acciones, porque generar una lotería entera no cabe
// en el tiempo de una sola llamada:
//   start    — cobra 5 tokens y guarda la voz escogida (start_caller_voice).
//   generate — genera, sin costo, el audio de una carta (o de la frase de arranque) de una lotería pagada;
//              si ya existe con el mismo título, no hace nada (decisión 15).
//   refund   — devuelve los 5 tokens si no salió ninguna carta (refund_caller_voice).
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { buildCorsHeaders, parseAllowedOrigins } from '../_shared/cors.ts';
import { createPrediction, firstOutput, waitForPrediction, type ReplicateDeps } from '../_shared/replicate.ts';
import {
  audioPath, buildSpeechBody, CALLER_INTRO_TEXT, type CallerVoiceId, INTRO_ID, mapCallerVoiceError, needsAudio,
  parseCallerVoiceRequest, SPEECH_MODEL_PATH, toCallerVoiceErrorResponse,
} from '../_shared/callerVoice.ts';

const AUDIO_BUCKET = 'caller-audio';

const replicateDeps: ReplicateDeps = {
  fetchFn: fetch,
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  now: () => Date.now(),
};

async function speak(replicateToken: string, text: string, voiceId: CallerVoiceId): Promise<ArrayBuffer> {
  const created = await createPrediction(replicateDeps, replicateToken, buildSpeechBody(text, voiceId), 3, SPEECH_MODEL_PATH);
  const finished = await waitForPrediction(replicateDeps, replicateToken, created, { timeoutMs: 60_000, intervalMs: 1000 });
  if (finished.status !== 'succeeded') throw new Error(`Predicción ${finished.status}: ${finished.error ?? 'sin detalle'}`);
  const res = await fetch(firstOutput(finished));
  if (!res.ok) throw new Error(`descarga del audio (${res.status})`);
  return await res.arrayBuffer();
}

async function generate(
  admin: SupabaseClient, replicateToken: string, userId: string, setId: string, cardId: string,
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

  const mp3 = await speak(replicateToken, text, voice.voice_id as CallerVoiceId);
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
  const replicateToken = Deno.env.get('REPLICATE_API_TOKEN');
  if (!serviceRoleKey || !replicateToken) {
    console.error('caller-voice: falta SERVICE_ROLE_KEY o REPLICATE_API_TOKEN');
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
        return reply(200, { status: await generate(admin, replicateToken, user.id, request.setId, request.cardId) });
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
