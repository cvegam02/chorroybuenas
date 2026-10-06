export type ParseResult<T> = { ok: true; value: T } | { ok: false; message: string };

/** ~2.2 MB de imagen; el cliente envía JPEG de máx. 768 px (~200 KB). */
export const MAX_IMAGE_DATA_URI_CHARS = 3_000_000;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const IMAGE_DATA_URI_RE = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/;

export const fail = (message: string): { ok: false; message: string } => ({ ok: false, message });

export function isUuid(v: unknown): v is string {
  return typeof v === 'string' && UUID_RE.test(v);
}

export function validateImageDataUri(
  image: unknown,
  maxChars: number = MAX_IMAGE_DATA_URI_CHARS,
): ParseResult<string> {
  if (typeof image !== 'string') return fail('Se requiere image (data URI base64).');
  if (image.length > maxChars) return fail('La imagen es demasiado grande.');
  if (!IMAGE_DATA_URI_RE.test(image)) return fail('Formato de imagen no soportado (png, jpeg o webp en base64).');
  return { ok: true, value: image };
}

export const MIN_CUSTOM_TOKENS = 1;
export const MAX_CUSTOM_TOKENS = 500;
const MAX_PROMO_CODE_LENGTH = 64;
const MAX_APP_URL_LENGTH = 500;

export interface PreferenceRequest {
  packId: string | null;
  customTokens: number | null;
  promoCode: string | null;
  appUrl: string | null;
}

/** Valida el cuerpo de create-payment-preference: exactamente uno de pack_id o custom_tokens. */
export function parsePreferenceRequest(body: unknown): ParseResult<PreferenceRequest> {
  if (typeof body !== 'object' || body === null) return fail('Body inválido.');
  const { pack_id, custom_tokens, promo_code, app_url } = body as Record<string, unknown>;

  const hasPack = pack_id !== undefined && pack_id !== null;
  const hasCustom = custom_tokens !== undefined && custom_tokens !== null;
  if (hasPack === hasCustom) return fail('Debes proporcionar pack_id o custom_tokens (solo uno).');

  if (hasPack && !isUuid(pack_id)) return fail('pack_id inválido.');

  if (hasCustom) {
    const valid =
      typeof custom_tokens === 'number' &&
      Number.isInteger(custom_tokens) &&
      custom_tokens >= MIN_CUSTOM_TOKENS &&
      custom_tokens <= MAX_CUSTOM_TOKENS;
    if (!valid) {
      return fail(`custom_tokens debe ser un entero entre ${MIN_CUSTOM_TOKENS} y ${MAX_CUSTOM_TOKENS}.`);
    }
  }

  let promoCode: string | null = null;
  if (promo_code !== undefined && promo_code !== null) {
    if (typeof promo_code !== 'string' || promo_code.length > MAX_PROMO_CODE_LENGTH) {
      return fail('promo_code inválido.');
    }
    promoCode = promo_code.trim().toUpperCase() || null;
  }

  const appUrl = typeof app_url === 'string' && app_url.length <= MAX_APP_URL_LENGTH ? app_url : null;

  return {
    ok: true,
    value: {
      packId: hasPack ? (pack_id as string) : null,
      customTokens: hasCustom ? (custom_tokens as number) : null,
      promoCode,
      appUrl,
    },
  };
}
