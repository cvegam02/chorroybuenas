/**
 * Vista previa protegida de una lotería de temporada (FEAT-17, decisión 4): la portada y las cartas
 * de muestra se reducen y se marcan en el navegador del administrador antes de subirse. La imagen
 * limpia nunca sale de su máquina.
 */
export const PREVIEW_MAX_SIDE = 600;
export const PREVIEW_UPLOAD_MAX_BYTES = 5 * 1024 * 1024;
export const PREVIEW_ACCEPTED_MIME_TYPES: readonly string[] = ['image/png', 'image/jpeg', 'image/webp'];
/** Formato en que se guarda la vista previa ya protegida. */
export const PREVIEW_OUTPUT_MIME_TYPE = 'image/jpeg';
export const PREVIEW_OUTPUT_EXTENSION = 'jpg';
export const WATERMARK_TEXT = 'chorroybuenas.com.mx';

const PREVIEW_OUTPUT_QUALITY = 0.85;
const WATERMARK_ANGLE = -Math.PI / 6;

export interface ImageSize {
  width: number;
  height: number;
}

/** Medidas para que ningún lado pase de `maxSide`, conservando la proporción y sin agrandar. */
export function fitWithin(width: number, height: number, maxSide: number = PREVIEW_MAX_SIDE): ImageSize {
  if (!(width > 0) || !(height > 0)) {
    throw new Error(`Medidas de imagen no válidas: ${width}×${height}`);
  }
  const scale = Math.min(1, maxSide / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/** Devuelve el motivo del rechazo, o null si la imagen sirve como portada o muestra. */
export function validatePreviewImage(file: { type: string; size: number }): string | null {
  if (!PREVIEW_ACCEPTED_MIME_TYPES.includes(file.type)) return 'La imagen tiene que ser PNG, JPEG o WebP.';
  if (file.size === 0) return 'El archivo está vacío.';
  if (file.size > PREVIEW_UPLOAD_MAX_BYTES) return 'La imagen pesa más de 5 MB.';
  return null;
}

/** Copia de la lista con el elemento de `from` colocado en `to`. Índices fuera de la lista: sin cambios. */
export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  const inRange = (index: number) => Number.isInteger(index) && index >= 0 && index < items.length;
  if (!inRange(from) || !inRange(to) || from === to) return [...items];
  const rest = items.filter((_, index) => index !== from);
  return [...rest.slice(0, to), items[from], ...rest.slice(to)];
}

export function removeAt<T>(items: readonly T[], index: number): T[] {
  return items.filter((_, i) => i !== index);
}

/** Repite la marca en diagonal sobre toda la imagen, con las filas alternadas. */
function drawWatermark(ctx: CanvasRenderingContext2D, { width, height }: ImageSize): void {
  const fontSize = Math.max(12, Math.round(Math.min(width, height) * 0.06));
  const reach = Math.hypot(width, height);

  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.rotate(WATERMARK_ANGLE);
  ctx.font = `700 ${fontSize}px sans-serif`;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.lineWidth = Math.max(1, fontSize / 14);

  const stepX = ctx.measureText(WATERMARK_TEXT).width + fontSize * 2;
  const stepY = fontSize * 3.5;
  let row = 0;
  for (let y = -reach; y <= reach; y += stepY) {
    const offset = row % 2 === 0 ? 0 : stepX / 2;
    for (let x = -reach - offset; x <= reach; x += stepX) {
      ctx.strokeText(WATERMARK_TEXT, x, y);
      ctx.fillText(WATERMARK_TEXT, x, y);
    }
    row += 1;
  }
  ctx.restore();
}

/** Reduce la imagen y le pone la marca de agua. Solo funciona en el navegador. */
export async function createProtectedPreview(file: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  try {
    const size = fitWithin(bitmap.width, bitmap.height);
    const canvas = document.createElement('canvas');
    canvas.width = size.width;
    canvas.height = size.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('El navegador no permite preparar la imagen.');

    // Fondo blanco: el JPEG no guarda transparencia.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size.width, size.height);
    ctx.drawImage(bitmap, 0, 0, size.width, size.height);
    drawWatermark(ctx, size);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('No se pudo preparar la imagen.'))),
        PREVIEW_OUTPUT_MIME_TYPE,
        PREVIEW_OUTPUT_QUALITY,
      );
    });
  } finally {
    bitmap.close();
  }
}
