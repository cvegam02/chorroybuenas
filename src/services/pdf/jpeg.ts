import { imageFormatOfBytes, type ImageFormat } from './imageFormat';

/** Calidad del JPEG al convertir una imagen para el PDF: alta, sin pérdida visible al imprimir. */
export const PDF_JPEG_QUALITY = 0.92;
/** Fondo que recibe una imagen con transparencia: una carta impresa va sobre papel blanco. */
const TRANSPARENCY_BACKGROUND = '#ffffff';

const BROWSER_MIME_TYPES: Record<ImageFormat, string> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  otro: '',
};

export type JpegConverter = (bytes: Uint8Array, format: ImageFormat) => Promise<Uint8Array>;

const decodeImage = (blob: Blob): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No se pudo leer la imagen para convertirla a JPEG'));
    };
    img.src = url;
  });

/** Convierte una imagen a JPEG en el navegador, sobre fondo blanco. */
export const convertToJpegInBrowser: JpegConverter = async (bytes, format) => {
  const img = await decodeImage(new Blob([bytes as BlobPart], { type: BROWSER_MIME_TYPES[format] }));
  if (img.naturalWidth === 0 || img.naturalHeight === 0) {
    throw new Error('La imagen tiene dimensiones inválidas (0x0)');
  }

  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo preparar la conversión de la imagen a JPEG');

  ctx.fillStyle = TRANSPARENCY_BACKGROUND;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0);

  const jpeg = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('No se pudo convertir la imagen a JPEG'))),
      'image/jpeg',
      PDF_JPEG_QUALITY,
    );
  });
  return new Uint8Array(await jpeg.arrayBuffer());
};

/**
 * Bytes JPEG de una imagen para el PDF. Una que ya es JPEG pasa tal cual, sin volver a comprimirse;
 * cualquier otra (WebP, PNG…) se convierte, porque dentro del PDF pesaría varias veces más.
 */
export const ensureJpegBytes = async (
  bytes: Uint8Array,
  convert: JpegConverter = convertToJpegInBrowser,
): Promise<Uint8Array> => {
  const format = imageFormatOfBytes(bytes);
  return format === 'jpeg' ? bytes : convert(bytes, format);
};
