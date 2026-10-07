import type { Prediction } from './replicate.ts';
import { fail, isUuid, validateImageDataUri, type ParseResult } from './validation.ts';

const GPT_IMAGE_VERSION = '118f53498ea7319519229b2d5bd0d4a69e3d77eb60d6292d5db38125534dc1ca';
const DEFAULT_PROMPT_STRENGTH = 0.5;
const HIGH_FIDELITY_THRESHOLD = 0.4;

const LOTERIA_PROMPT_TAIL = `
Style: Traditional Don Clemente Gallo vintage lithograph from the 1940s. 
Visual details:
- Bold, thick black ink outlines. Naive folk art drawing style.
- Vibrant primary colors (Mexican pink, deep teal, sunflower yellow).
- Flat, solid colors with visible ink texture and aged paper grain.
- NO 3D, NO photorealism, NO modern digital gradients.
- NO text, NO borders inside the image.
The output should look like a hand-painted card from a vintage Loteria set.`;

const PROMPTS: Record<0 | 1 | 2, string> = {
  0: `Authentic Mexican Loteria card illustration. Style: Traditional Don Clemente Gallo vintage lithograph from the 1940s. Visual details: - Subject MUST keep the exact features, pose, and silhouette from the input image. - Bold, thick black ink outlines. Naive folk art drawing style. - Vibrant primary colors (Mexican pink, deep teal, sunflower yellow). - Flat, solid colors with visible ink texture and aged paper grain. - NO 3D, NO photorealism, NO modern digital gradients. - NO text, NO borders inside the image. The output should look like a hand-painted card from a vintage Loteria set.`,
  1: `Create an original 2D folk art illustration inspired by the input image.
Do NOT preserve exact facial features, body proportions, or identity.
The result must be an original character.${LOTERIA_PROMPT_TAIL}`,
  2: `Create a symbolic illustration inspired by the theme and colors of the image.${LOTERIA_PROMPT_TAIL}`,
};

export interface TransformRequest {
  image: string;
  promptVariant: 0 | 1 | 2;
  strength: number;
  setId: string | null;
}

/**
 * Solo la imagen es obligatoria; los demás parámetros se normalizan a su valor por defecto.
 * El modelo no se elige desde el navegador: siempre se usa GPT-Image, que es el que aplica el filtro de contenido.
 */
export function parseTransformRequest(body: unknown): ParseResult<TransformRequest> {
  if (typeof body !== 'object' || body === null) return fail('Body JSON inválido.');
  const raw = body as Record<string, unknown>;

  const image = validateImageDataUri(raw.image);
  if (!image.ok) return image;

  const variant = raw.prompt_variant;
  const strength = raw.prompt_strength;
  return {
    ok: true,
    value: {
      image: image.value,
      promptVariant: variant === 1 || variant === 2 ? variant : 0,
      strength: typeof strength === 'number' && strength >= 0 && strength <= 1 ? strength : DEFAULT_PROMPT_STRENGTH,
      setId: isUuid(raw.set_id) ? raw.set_id : null,
    },
  };
}

/** Cuerpo de la predicción de Replicate. */
export function buildPredictionBody(req: TransformRequest): { version: string; input: Record<string, unknown> } {
  return {
    version: GPT_IMAGE_VERSION,
    input: {
      input_images: [req.image],
      prompt: PROMPTS[req.promptVariant],
      input_fidelity: req.strength > HIGH_FIDELITY_THRESHOLD ? 'high' : 'low',
      quality: 'low',
      aspect_ratio: '2:3',
      output_format: 'webp',
    },
  };
}

/** Lanza NSFW_FILTER / SENSITIVE_CONTENT_FILTER si el fallo fue un filtro de contenido. */
export function assertPredictionSucceeded(p: Prediction): void {
  if (p.status === 'succeeded') return;
  const msg = `${p.error ?? ''}${p.logs ?? ''}`.toLowerCase();
  if (/nsfw|blocked|safety|content policy/.test(msg)) throw new Error('NSFW_FILTER');
  if (/sensitive|e005/.test(msg)) throw new Error('SENSITIVE_CONTENT_FILTER');
  throw new Error(`Predicción ${p.status}: ${p.error ?? 'sin detalle'}`);
}

/** Traduce el error de la RPC spend_tokens_for_user a un código público, o conserva el detalle. */
export function mapSpendError(message: string): Error {
  if (message.includes('INSUFFICIENT_TOKENS')) return new Error('INSUFFICIENT_TOKENS');
  if (message.includes('RATE_LIMITED')) return new Error('RATE_LIMITED');
  return new Error(`spend_tokens_for_user: ${message}`);
}

const PUBLIC_ERRORS: Record<string, { status: number; message: string }> = {
  INSUFFICIENT_TOKENS: { status: 402, message: 'No tienes tokens suficientes.' },
  RATE_LIMITED: { status: 429, message: 'Demasiadas solicitudes. Espera un minuto e intenta de nuevo.' },
  NSFW_FILTER: { status: 422, message: 'La imagen fue bloqueada por el filtro de contenido.' },
  SENSITIVE_CONTENT_FILTER: { status: 422, message: 'La imagen fue marcada como contenido sensible.' },
  AI_TIMEOUT: { status: 504, message: 'La IA tardó demasiado. Intenta de nuevo.' },
};

/**
 * Respuesta HTTP para un error de la transformación. Los códigos conocidos se devuelven tal cual;
 * cualquier otro se reporta como AI_ERROR genérico (internal: true → el handler registra el detalle).
 */
export function toErrorResponse(err: unknown): {
  status: number;
  body: { error: string; message: string };
  internal: boolean;
} {
  const raw = err instanceof Error ? err.message : String(err);
  const known = PUBLIC_ERRORS[raw];
  if (known) return { status: known.status, body: { error: raw, message: known.message }, internal: false };
  return {
    status: 502,
    body: { error: 'AI_ERROR', message: 'No se pudo transformar la imagen. Intenta de nuevo.' },
    internal: true,
  };
}
