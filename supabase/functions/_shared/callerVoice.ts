import { fail, isUuid, type ParseResult } from './validation.ts';

/** Las cuatro voces de MiniMax que escogió Carlos (FEAT-55, decisión 22). Iguales a las de la migración 060. */
export const CALLER_VOICES = [
  'Spanish_Narrator', 'Spanish_Steadymentor', 'Spanish_WiseScholar', 'Spanish_Wiselady',
] as const;
export type CallerVoiceId = typeof CALLER_VOICES[number];

/** Modelo oficial de Replicate: se llama por su nombre, sin versión. */
export const SPEECH_MODEL_PATH = '/models/minimax/speech-02-hd/predictions';

/** «Se va y se corre con…», con la voz escogida (decisión 23). */
export const CALLER_INTRO_TEXT = 'Se va y se corre con...';
export const INTRO_ID = 'intro';

export type CallerVoiceRequest =
  | { action: 'start'; setId: string; voiceId: CallerVoiceId }
  | { action: 'generate'; setId: string; cardId: string }
  | { action: 'refund'; setId: string };

function isVoice(v: unknown): v is CallerVoiceId {
  return typeof v === 'string' && (CALLER_VOICES as readonly string[]).includes(v);
}

export function parseCallerVoiceRequest(body: unknown): ParseResult<CallerVoiceRequest> {
  if (typeof body !== 'object' || body === null) return fail('Body JSON inválido.');
  const raw = body as Record<string, unknown>;
  if (!isUuid(raw.set_id)) return fail('Se requiere set_id.');
  const setId = raw.set_id;

  switch (raw.action) {
    case 'start':
      if (!isVoice(raw.voice_id)) return fail('Voz no válida.');
      return { ok: true, value: { action: 'start', setId, voiceId: raw.voice_id } };
    case 'generate':
      if (raw.card_id !== INTRO_ID && !isUuid(raw.card_id)) return fail('Se requiere card_id.');
      return { ok: true, value: { action: 'generate', setId, cardId: raw.card_id as string } };
    case 'refund':
      return { ok: true, value: { action: 'refund', setId } };
    default:
      return fail('Acción no válida.');
  }
}

/** Cuerpo de la predicción de MiniMax Speech 02 HD. */
export function buildSpeechBody(text: string, voiceId: CallerVoiceId): { input: Record<string, unknown> } {
  return {
    input: { text, voice_id: voiceId, language_boost: 'Spanish', audio_format: 'mp3' },
  };
}

/** Ruta en el bucket caller-audio: la carpeta del dueño es la que deja leer la regla de acceso. */
export function audioPath(userId: string, setId: string, cardId: string): string {
  return `${userId}/${setId}/${cardId}.mp3`;
}

/** Una carta necesita audio si no tiene o si se renombró después de generarlo (decisión 15). */
export function needsAudio(audioTitle: string | null, cardTitle: string): boolean {
  return audioTitle !== cardTitle;
}

const RPC_CODES = ['INSUFFICIENT_TOKENS', 'VOICE_ALREADY_CREATED', 'INVALID_VOICE', 'SET_NOT_FOUND', 'AUDIOS_EXIST'];

/** Traduce el error de start_caller_voice / refund_caller_voice a un código público, o conserva el detalle. */
export function mapCallerVoiceError(message: string): Error {
  const code = RPC_CODES.find((c) => message.includes(c));
  return new Error(code ?? `caller voice rpc: ${message}`);
}

const PUBLIC_ERRORS: Record<string, { status: number; message: string }> = {
  INSUFFICIENT_TOKENS: { status: 402, message: 'No tienes tokens suficientes.' },
  VOICE_ALREADY_CREATED: { status: 409, message: 'Esta lotería ya tiene voz con IA.' },
  AUDIOS_EXIST: { status: 409, message: 'Ya se generaron cartas con esta voz; no hay devolución.' },
  INVALID_VOICE: { status: 400, message: 'Voz no válida.' },
  SET_NOT_FOUND: { status: 404, message: 'No encontramos esta lotería.' },
  CARD_NOT_FOUND: { status: 404, message: 'No encontramos esta carta.' },
  VOICE_NOT_PAID: { status: 403, message: 'Esta lotería no tiene voz con IA.' },
  AI_BUSY: { status: 503, message: 'La IA está ocupada. Intenta de nuevo en un momento.' },
  AI_TIMEOUT: { status: 504, message: 'La IA tardó demasiado. Intenta de nuevo.' },
};

export function toCallerVoiceErrorResponse(err: unknown): {
  status: number;
  body: { error: string; message: string };
  internal: boolean;
} {
  const raw = err instanceof Error ? err.message : String(err);
  const known = PUBLIC_ERRORS[raw];
  if (known) return { status: known.status, body: { error: raw, message: known.message }, internal: false };
  return {
    status: 502,
    body: { error: 'AI_ERROR', message: 'No se pudo generar la voz. Intenta de nuevo.' },
    internal: true,
  };
}
