/** Una llamada a la edge function transform-loteria. Rechaza con un Error cuyo message es un código. */
export type EdgeCall = (params: { prompt_variant: 0 | 1 | 2 }) => Promise<string>;

export interface FallbackOptions {
  /** Llamado al reintentar con un prompt más permisivo (intento 2 o 3). */
  onSensitiveRetry?: (attempt: number, messageKey: string) => void;
  delay?: (ms: number) => Promise<void>;
}

const RETRY_DELAY_MS = 500;
/** Cada intento cobra y reembolsa un token en el servidor: los reintentos tienen tope. */
const MAX_NSFW_RETRIES = 2;
const LAST_VARIANT = 2;
const SENSITIVE = new Set(['SENSITIVE_CONTENT_FILTER', 'SENSITIVE_PHOTO_NOT_SUPPORTED', 'NSFW_FILTER']);

const messageOf = (error: unknown): string => (error instanceof Error ? error.message : String(error));
const defaultDelay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Estrategia de reintentos de la transformación:
 * prompt 0 → 1 → 2 ante contenido sensible. Hay un solo modelo: una foto rechazada por el filtro
 * de contenido se rinde con SENSITIVE_PHOTO_NOT_SUPPORTED.
 */
export async function transformWithFallback(call: EdgeCall, opts: FallbackOptions = {}): Promise<string> {
  const delay = opts.delay ?? defaultDelay;

  let variant: 0 | 1 | 2 = 0;
  let nsfwRetries = 0;

  for (;;) {
    try {
      return await call({ prompt_variant: variant });
    } catch (error) {
      const message = messageOf(error);
      if (message === 'NSFW_FILTER' && nsfwRetries < MAX_NSFW_RETRIES) {
        nsfwRetries++;
        await delay(RETRY_DELAY_MS);
        continue;
      }
      if (message !== 'SENSITIVE_CONTENT_FILTER') throw error;
      if (variant === LAST_VARIANT) throw new Error('SENSITIVE_PHOTO_NOT_SUPPORTED');
      variant = (variant + 1) as 1 | 2;
      opts.onSensitiveRetry?.(variant, 'cardEditor.errors.aiSensitiveRetrying');
      await delay(RETRY_DELAY_MS);
    }
  }
}

/** La foto fue rechazada por el filtro de contenido (no es un fallo del servicio ni de la cuenta). */
export function isSensitiveContentError(message: string): boolean {
  return SENSITIVE.has(message);
}

const I18N_KEYS: Record<string, string> = {
  INSUFFICIENT_TOKENS: 'cardEditor.errors.insufficientTokens',
  NOT_LOGGED_IN: 'cardEditor.errors.aiNotLoggedIn',
  RATE_LIMITED: 'cardEditor.errors.aiRateLimited',
  AI_TIMEOUT: 'cardEditor.errors.aiTimeout',
  SENSITIVE_PHOTO_NOT_SUPPORTED: 'cardEditor.errors.aiSensitivePhotoNotSupported',
  SENSITIVE_CONTENT_FILTER: 'cardEditor.errors.aiSensitiveContent',
  NSFW_FILTER: 'cardEditor.errors.aiSensitiveContent',
};

/** Clave de traducción del mensaje que debe ver el usuario para un código de error de la IA. */
export function aiErrorToI18nKey(message: string): string {
  return I18N_KEYS[message] ?? 'cardEditor.errors.genericContactAdmin';
}
