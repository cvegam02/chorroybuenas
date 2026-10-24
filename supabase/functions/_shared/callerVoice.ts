import { fail, isUuid, type ParseResult } from './validation.ts';

/**
 * Las 8 voces mexicanas de la biblioteca de ElevenLabs que escogió Carlos (FEAT-55, decisión 29), en el orden
 * en que se ofrecen. Iguales a las de la migración 060.
 */
export const CALLER_VOICES = [
  'y2ijeTfmnXjzheHO6zeN', 'qRUgOhnxGASxirG4fKjv', 'gbTn1bmCvNgk0QEAVyfM', 'iDEmt5MnqUotdwCIVplo',
  'hHjbwzYZW17oh0p05AKv', 'twZzvyYIl5ntDHC1Vatv', 'ay4iqk10DLwc8KGSrf2t', 'JYyJjNPfmNJdaby8LdZs',
] as const;
export type CallerVoiceId = typeof CALLER_VOICES[number];

const ELEVENLABS_TTS_URL = 'https://api.elevenlabs.io/v1/text-to-speech';
/** El modelo más expresivo de ElevenLabs: entiende indicaciones de tono entre corchetes (decisión 30). */
const SPEECH_MODEL = 'eleven_v3';
/** El tono del cantador de lotería que escogió Carlos (decisión 30). */
const CALL_TONE = '[pregonando, cantadito, alargando la última sílaba]';
/** Cuántas veces más se repite la última vocal para que la alargue. */
const STRETCH = 2;
const VOWEL_RE = /[aeiouáéíóúü]/i;
const BASE_VOWEL: Record<string, string> = { á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u', ü: 'u' };

/** Alarga la última vocal de la última palabra («Catrín» → «Catríiin»); no toca palabras con números. */
function stretchLastVowel(text: string): string {
  const start = text.lastIndexOf(' ') + 1;
  const word = text.slice(start);
  if (/\d/.test(word)) return text;
  for (let i = word.length - 1; i >= 0; i--) {
    if (VOWEL_RE.test(word[i])) {
      const lower = word[i].toLowerCase();
      const extra = (BASE_VOWEL[lower] ?? lower).repeat(STRETCH);
      return text.slice(0, start) + word.slice(0, i + 1) + extra + word.slice(i + 1);
    }
  }
  return text;
}

/**
 * Lo que se le pide decir a ElevenLabs: el título pregonado, como cantador de lotería, con exclamación y la
 * última vocal alargada (decisión 30). La frase de arranque, que termina en «...», se dice sin alargar.
 */
export function callText(title: string): string {
  const trimmed = title.trim();
  const body = trimmed.endsWith('...')
    ? trimmed
    : stretchLastVowel(trimmed.replace(/^[¡!¿?\s]+/, '').replace(/[.,;:!?¡¿\s]+$/, ''));
  return `${CALL_TONE} ¡${body}!`;
}

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

/** La llamada a ElevenLabs que dice el texto con la voz escogida; responde el MP3 directamente. */
export function buildSpeechRequest(
  text: string,
  voiceId: CallerVoiceId,
): { url: string; body: Record<string, unknown> } {
  return {
    url: `${ELEVENLABS_TTS_URL}/${voiceId}?output_format=mp3_44100_64`,
    // Estabilidad 0 («creativa» en v3): la más expresiva
    body: { text, model_id: SPEECH_MODEL, language_code: 'es', voice_settings: { stability: 0 } },
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
