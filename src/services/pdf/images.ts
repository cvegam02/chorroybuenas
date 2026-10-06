import { PDFDocument, type PDFImage } from 'pdf-lib';
import { blobToBase64 } from '../../utils/indexedDB';
import { logger } from '../../utils/logger';

export interface ImageData {
  data: Uint8Array;
  width: number;
  height: number;
}

/**
 * Converts blob URL or HTTP(S) URL to base64 for PDF generation
 */
export const urlToBase64 = async (url: string): Promise<string> => {
  try {
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const blob = await response.blob();
    return await blobToBase64(blob);
  } catch (error) {
    logger.error('Error converting URL to base64:', error);
    throw error;
  }
};

export const blobURLToBase64 = async (blobURL: string): Promise<string> => urlToBase64(blobURL);

/** Convierte cualquier imagen (data URL) a PNG vía canvas. Útil para WebP y otros formatos que pdf-lib no soporta. */
export const dataURLToPngBytes = (dataUrl: string): Promise<Uint8Array> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('No canvas context'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Canvas toBlob failed'));
            return;
          }
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result;
            if (typeof result !== 'string') {
              reject(new Error('Expected string from FileReader'));
              return;
            }
            const base64 = result.includes(',') ? result.split(',')[1] : result;
            const binary = atob(base64);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
            resolve(bytes);
          };
          reader.readAsDataURL(blob);
        },
        'image/png',
        0.95
      );
    };
    img.onerror = () => reject(new Error('Failed to load image for conversion'));
    img.src = dataUrl;
  });
};

export const loadImageAsUint8Array = async (imageSrc: string): Promise<ImageData> => {
  let base64Image: string;

  // If it's a blob URL, convert to base64 first
  if (imageSrc.startsWith('blob:')) {
    try {
      base64Image = await blobURLToBase64(imageSrc);
    } catch (error) {
      logger.error('Error converting blob URL to base64:', error);
      throw new Error(`No se pudo convertir el blob URL a base64: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  } else {
    base64Image = imageSrc;
  }

  // Remove data URL prefix if present
  const base64Data = base64Image.includes(',')
    ? base64Image.split(',')[1]
    : base64Image;

  if (!base64Data || base64Data.length === 0) {
    throw new Error('El base64 de la imagen está vacío');
  }

  let binaryString: string;
  try {
    binaryString = atob(base64Data);
  } catch (error) {
    logger.error('Error decoding base64:', error);
    throw new Error(`Error al decodificar base64: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }

  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // Create image to get dimensions
  const img = new Image();
  img.src = base64Image;
  await new Promise((resolve, reject) => {
    img.onload = () => {
      if (img.width === 0 || img.height === 0) {
        reject(new Error('La imagen tiene dimensiones inválidas (0x0)'));
      } else {
        resolve(undefined);
      }
    };
    img.onerror = (error) => {
      logger.error('Error loading image:', error);
      reject(new Error('No se pudo cargar la imagen para obtener sus dimensiones'));
    };
  });

  return {
    data: bytes,
    width: img.width,
    height: img.height,
  };
};

export type EmbedResult = { image: PDFImage; width: number; height: number };

export const embedImageInPDF = async (
  pdfDoc: PDFDocument,
  imageSrc: string,
  embedCache?: Map<string, EmbedResult>,
  cacheKey?: string
): Promise<EmbedResult> => {
  if (embedCache && cacheKey) {
    const cached = embedCache.get(cacheKey);
    if (cached) return cached;
  }

  try {
    let base64Image: string;

    if (imageSrc.startsWith('blob:') || imageSrc.startsWith('http://') || imageSrc.startsWith('https://')) {
      base64Image = await urlToBase64(imageSrc);
    } else {
      base64Image = imageSrc;
    }

    const imageData = await loadImageAsUint8Array(base64Image);

    let image;
    // Determine image format from magic bytes (more reliable than MIME/prefix).
    // This fixes cases where Storage sets a wrong Content-Type (e.g. JPG bytes served as image/png).
    const bytes = imageData.data;
    const isPng =
      bytes.length >= 8 &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a;
    const isJpg = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;

    if (isPng) {
      image = await pdfDoc.embedPng(bytes);
    } else if (isJpg) {
      image = await pdfDoc.embedJpg(bytes);
    } else {
      const pngBytes = await dataURLToPngBytes(base64Image.startsWith('data:') ? base64Image : `data:image/png;base64,${base64Image}`);
      image = await pdfDoc.embedPng(pngBytes);
    }

    const { width, height } = image.scale(1);
    const result: EmbedResult = { image, width, height };
    if (embedCache && cacheKey) embedCache.set(cacheKey, result);
    return result;
  } catch (error) {
    logger.error('Error in embedImageInPDF:', error);
    logger.error('Image source:', imageSrc.substring(0, 100));
    throw error;
  }
};
