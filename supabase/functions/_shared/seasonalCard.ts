/**
 * Generar una carta de lotería temática con IA (FEAT-50, US A2): lo que no depende de la red, para
 * probarlo sin Deno. La llamada sigue a mano lo que Carlos hacía en Replicate: openai/gpt-image-2,
 * 2:3, WebP, calidad elegida y, si hay, la imagen de entrada.
 */
import { fail, isUuid, type ParseResult } from './validation.ts';

/** Modelo oficial de Replicate: se llama por su nombre, sin versión. */
export const SEASONAL_CARD_MODEL_PATH = '/models/openai/gpt-image-2/predictions';

export type SeasonalCardQuality = 'low' | 'medium' | 'high';

export interface SeasonalCardText {
  number: number;
  name: string;
  scene: string;
}

export function parseGenerateCardRequest(body: unknown): ParseResult<{ cardId: string }> {
  if (typeof body !== 'object' || body === null) return fail('Body JSON inválido.');
  const cardId = (body as Record<string, unknown>).card_id;
  if (!isUuid(cardId)) return fail('card_id inválido.');
  return { ok: true, value: { cardId } };
}

/** El prompt general, una línea en blanco y los datos de la carta, en el formato de siempre. */
export function buildSeasonalCardPrompt(generalPrompt: string, card: SeasonalCardText): string {
  const lines = [`Número: "${card.number}"`, `Nombre: "${card.name}"`];
  if (card.scene.trim() !== '') lines.push(`Escena: ${card.scene.trim()}`);
  return `${generalPrompt.trim()}\n\n${lines.join('\n')}`;
}

export function buildSeasonalCardPrediction(
  prompt: string,
  quality: SeasonalCardQuality,
  inputImageUrl: string | null,
): { input: Record<string, unknown> } {
  return {
    input: {
      prompt,
      ...(inputImageUrl ? { input_images: [inputImageUrl] } : {}),
      aspect_ratio: '2:3',
      quality,
      output_format: 'webp',
      number_of_images: 1,
    },
  };
}

export const attemptPath = (loteriaId: string, cardId: string, attemptId: string) =>
  `${loteriaId}/${cardId}/${attemptId}.webp`;

/** Intentos que guarda cada carta (FEAT-50, decisión 7). */
export const MAX_ATTEMPTS_PER_CARD = 5;

/**
 * Los intentos que sobran al pasar del máximo, del más viejo al más nuevo (US A3). Recibe los ids en
 * orden de creación; los protegidos (el elegido antes de rehacer y el nuevo) nunca se borran.
 */
export function attemptsToPrune(
  idsOldestFirst: readonly string[],
  protectedIds: readonly string[],
  max = MAX_ATTEMPTS_PER_CARD,
): string[] {
  const excess = idsOldestFirst.length - max;
  if (excess <= 0) return [];
  return idsOldestFirst.filter((id) => !protectedIds.includes(id)).slice(0, excess);
}

const PUBLIC_ERRORS: Record<string, { status: number; message: string }> = {
  NOT_ADMIN: { status: 403, message: 'Solo un administrador puede generar cartas.' },
  CARD_NOT_FOUND: { status: 404, message: 'La carta ya no existe. Vuelve a cargar la página.' },
  PROMPT_MISSING: { status: 400, message: 'Escribe el prompt general antes de generar.' },
  BASE_CARD_MISSING: { status: 409, message: 'Falta esa carta en la baraja base. Súbela en Temáticas → Baraja base.' },
  REFERENCE_MISSING: { status: 409, message: 'Aún no hay carta de referencia. Marca una carta generada como referencia.' },
  AI_BUSY: { status: 503, message: 'Replicate está ocupado. Espera un momento e intenta de nuevo.' },
  AI_TIMEOUT: { status: 504, message: 'La IA tardó demasiado. Intenta de nuevo.' },
  NSFW_FILTER: { status: 422, message: 'El filtro de contenido bloqueó la imagen. Ajusta la escena o el prompt.' },
  SENSITIVE_CONTENT_FILTER: { status: 422, message: 'La imagen se marcó como contenido sensible. Ajusta la escena o el prompt.' },
};

/** Los errores conocidos se explican; cualquier otro es AI_ERROR y el detalle va al registro. */
export function seasonalCardErrorResponse(err: unknown): {
  status: number;
  body: { error: string; message: string };
  internal: boolean;
} {
  const raw = err instanceof Error ? err.message : String(err);
  const known = PUBLIC_ERRORS[raw];
  if (known) return { status: known.status, body: { error: raw, message: known.message }, internal: false };
  return {
    status: 502,
    body: { error: 'AI_ERROR', message: 'No se pudo generar la carta. Intenta de nuevo.' },
    internal: true,
  };
}
