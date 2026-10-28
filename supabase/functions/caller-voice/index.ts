// Voz con IA del cantador (FEAT-55, US A6). Cuatro acciones, porque generar una lotería entera no cabe
// en el tiempo de una sola llamada:
//   start    — revisa el cupo de ElevenLabs, cobra según las cartas (10 tokens hasta 60 y 2 por cada 10 más;
//              FEAT-58, decisiones 8 y 11) y guarda la voz escogida (start_caller_voice).
//   expand   — «Ampliar la voz»: revisa el cupo y cobra los bloques de cartas sin cubrir (expand_caller_voice).
//   generate — genera con ElevenLabs (decisión 29), sin costo, el audio de una carta (o de la frase de arranque)
//              de una lotería pagada; si ya existe con el mismo título, no hace nada (decisión 15). Tope: las
//              cartas cubiertas más 10 audios, y 20 regeneraciones por minuto (FEAT-58, decisión 7). Si otra
//              lotería ya tiene ese texto con esa voz, lo copia sin costo (FEAT-58, decisión 12).
//   refund   — devuelve lo cobrado si no salió ninguna carta ni la frase (refund_caller_voice; FEAT-58,
//              decisión 10).
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { buildCorsHeaders, parseAllowedOrigins } from '../_shared/cors.ts';
import {
  audioPath, buildSpeechRequest, callText, CALLER_INTRO_TEXT, type CallerVoiceId, INTRO_ID, mapCallerVoiceError,
  parseCallerVoiceRequest, sharedAudioPath, toCallerVoiceErrorResponse,
} from '../_shared/callerVoice.ts';
import { createResendSender } from '../_shared/email.ts';
import {
  buildQuotaAlertEmail, creditsFor, ensureVoiceQuota, parseSubscription, type VoiceQuotaDeps,
} from '../_shared/voiceQuota.ts';

const AUDIO_BUCKET = 'caller-audio';
const ELEVENLABS_SUBSCRIPTION_URL = 'https://api.elevenlabs.io/v1/user/subscription';
/** Lo más que se espera a ElevenLabs para saber el cupo. */
const QUOTA_TIMEOUT_MS = 10_000;
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

/** El audio compartido de ese texto con esa voz (FEAT-58, decisión 12), o null si todavía no existe. */
async function readShared(admin: SupabaseClient, voiceId: CallerVoiceId, text: string): Promise<ArrayBuffer | null> {
  const { data, error } = await admin.storage.from(AUDIO_BUCKET).download(await sharedAudioPath(voiceId, text));
  if (error || !data) return null;
  return await data.arrayBuffer();
}

/** Guarda un audio recién generado para reutilizarlo; si otro ya lo guardó, no pasa nada. */
async function saveShared(admin: SupabaseClient, voiceId: CallerVoiceId, text: string, mp3: ArrayBuffer): Promise<void> {
  const { error } = await admin.storage.from(AUDIO_BUCKET)
    .upload(await sharedAudioPath(voiceId, text), mp3, { contentType: 'audio/mpeg', upsert: false });
  if (error && !/exists|duplicate/i.test(error.message)) {
    console.error('caller-voice: no se guardó el audio compartido:', error.message);
  }
}

/**
 * Genera el audio de una carta o de la frase de arranque. Si ya existe uno compartido con la misma voz y el mismo
 * texto, lo copia sin llamar a ElevenLabs (FEAT-58, decisión 12). El de una carta se reserva antes en la base
 * (reserve_caller_audio: cobertura, tope y límite por minuto; lo copiado no cuenta) y se libera si falla.
 */
async function generate(
  admin: SupabaseClient, elevenLabsKey: string, userId: string, setId: string, cardId: string,
): Promise<'generated' | 'exists'> {
  const { data: voice, error: voiceError } = await admin.from('caller_voices')
    .select('voice_id, intro_path').eq('set_id', setId).eq('user_id', userId).maybeSingle();
  if (voiceError) throw new Error(`caller_voices: ${voiceError.message}`);
  if (!voice) throw new Error('VOICE_NOT_PAID');
  const voiceId = voice.voice_id as CallerVoiceId;

  const isIntro = cardId === INTRO_ID;
  let text = CALLER_INTRO_TEXT;
  let shared: ArrayBuffer | null;
  if (isIntro) {
    if (voice.intro_path) return 'exists';
    shared = await readShared(admin, voiceId, text);
  } else {
    // El título se lee antes para buscar su audio compartido; la reserva lo vuelve a leer con la voz bloqueada.
    const { data: card } = await admin.from('cards').select('title').eq('id', cardId).eq('set_id', setId).maybeSingle();
    shared = card ? await readShared(admin, voiceId, card.title) : null;
    const { data: title, error } = await admin.rpc('reserve_caller_audio', {
      p_user_id: userId, p_set_id: setId, p_card_id: cardId, p_shared: shared !== null,
    });
    if (error) throw mapCallerVoiceError(error.message);
    if (title === null) return 'exists';
    // Se renombró entre las dos lecturas: el audio compartido sería de otro título; no se contó nada.
    if (shared && title !== card?.title) throw new Error('AI_BUSY');
    text = title as string;
  }

  const path = audioPath(userId, setId, cardId);
  const counted = !isIntro && shared === null;
  try {
    const mp3 = shared ?? await speak(elevenLabsKey, callText(text), voiceId);
    const { error: uploadError } = await admin.storage.from(AUDIO_BUCKET)
      .upload(path, mp3, { contentType: 'audio/mpeg', upsert: true });
    if (uploadError) throw new Error(`subida del audio: ${uploadError.message}`);
    if (!shared) await saveShared(admin, voiceId, text, mp3);
  } catch (err) {
    if (counted) {
      const { error } = await admin.rpc('release_caller_audio', { p_set_id: setId });
      if (error) console.error('caller-voice: no se liberó el audio reservado:', error.message);
    }
    throw err;
  }

  // Se registra con la voz bloqueada: si mientras tanto se devolvió la voz o se borró la carta, no se registra
  // y el archivo se borra (FEAT-58, H17).
  const { data: saved, error: saveError } = await admin.rpc('save_caller_audio', {
    p_user_id: userId, p_set_id: setId, p_card_id: isIntro ? null : cardId, p_title: text, p_path: path,
  });
  if (saveError) throw new Error(`registro del audio: ${saveError.message}`);
  if (!saved) {
    const { error } = await admin.storage.from(AUDIO_BUCKET).remove([path]);
    if (error) console.error('caller-voice: no se borró un audio sin registrar:', error.message);
    throw new Error('VOICE_NOT_PAID');
  }
  return 'generated';
}

async function countCards(admin: SupabaseClient, setId: string): Promise<number> {
  const { count, error } = await admin.from('cards').select('id', { count: 'exact', head: true }).eq('set_id', setId);
  if (error) throw new Error(`cards: ${error.message}`);
  return count ?? 0;
}

/** El cupo de ElevenLabs y la alerta al administrador (FEAT-58, decisión 11). */
function quotaDeps(admin: SupabaseClient, elevenLabsKey: string): VoiceQuotaDeps {
  const resendKey = Deno.env.get('RESEND_API_KEY');
  const alertTo = Deno.env.get('ADMIN_ALERT_EMAIL');
  return {
    fetchSubscription: async () => {
      try {
        const res = await fetch(ELEVENLABS_SUBSCRIPTION_URL, {
          headers: { 'xi-api-key': elevenLabsKey }, signal: AbortSignal.timeout(QUOTA_TIMEOUT_MS),
        });
        if (!res.ok) {
          console.error(`caller-voice: ElevenLabs no dio el cupo (${res.status})`);
          return null;
        }
        return parseSubscription(await res.json());
      } catch (err) {
        console.error('caller-voice: no se pudo consultar el cupo:', err);
        return null;
      }
    },
    claimAlert: async (period) => {
      const { data, error } = await admin.rpc('claim_voice_quota_alert', { p_period: period });
      if (error) throw new Error(`claim_voice_quota_alert: ${error.message}`);
      return data === true;
    },
    releaseAlert: async (period) => {
      const { error } = await admin.rpc('release_voice_quota_alert', { p_period: period });
      if (error) throw new Error(`release_voice_quota_alert: ${error.message}`);
    },
    sendAlert: async (subscription) => {
      if (!resendKey || !alertTo) throw new Error('falta RESEND_API_KEY o ADMIN_ALERT_EMAIL');
      const email = buildQuotaAlertEmail(subscription);
      await createResendSender({ apiKey: resendKey })({
        to: alertTo, subject: email.subject, html: email.html, text: email.text,
        idempotencyKey: `voice-quota-${subscription.period}`,
      });
    },
    log: (message, err) => console.error(message, err),
  };
}

/** «Ampliar la voz» (FEAT-58, decisión 8): revisa el cupo para las cartas sin cubrir y cobra sus bloques. */
async function expand(admin: SupabaseClient, quota: VoiceQuotaDeps, userId: string, setId: string): Promise<number> {
  const { data: voice, error: voiceError } = await admin.from('caller_voices')
    .select('covered_cards').eq('set_id', setId).eq('user_id', userId).maybeSingle();
  if (voiceError) throw new Error(`caller_voices: ${voiceError.message}`);
  if (!voice) throw new Error('VOICE_NOT_PAID');
  const uncovered = (await countCards(admin, setId)) - (voice.covered_cards as number);
  if (uncovered <= 0) throw new Error('NOTHING_TO_EXPAND');
  await ensureVoiceQuota(quota, creditsFor(uncovered, false));
  const { data: tokens, error } = await admin.rpc('expand_caller_voice', { p_user_id: userId, p_set_id: setId });
  if (error) throw mapCallerVoiceError(error.message);
  return tokens as number;
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
        // Antes de cobrar: que el cupo de ElevenLabs alcance para la lotería (FEAT-58, decisión 11)
        const quota = quotaDeps(admin, elevenLabsKey);
        await ensureVoiceQuota(quota, creditsFor(await countCards(admin, request.setId), true));
        const { error } = await admin.rpc('start_caller_voice', {
          p_user_id: user.id, p_set_id: request.setId, p_voice_id: request.voiceId,
        });
        if (error) throw mapCallerVoiceError(error.message);
        return reply(200, { status: 'charged' });
      }
      case 'generate':
        return reply(200, { status: await generate(admin, elevenLabsKey, user.id, request.setId, request.cardId) });
      case 'expand':
        return reply(200, {
          status: 'charged', tokens: await expand(admin, quotaDeps(admin, elevenLabsKey), user.id, request.setId),
        });
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
