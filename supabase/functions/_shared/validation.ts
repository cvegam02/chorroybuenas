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
