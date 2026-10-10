import { PDFDocument, StandardFonts, type PDFFont } from 'pdf-lib';
import arvoBoldUrl from '../../fonts/Arvo-Bold.ttf';
import { logger } from '../../utils/logger';

let fontBytes: Promise<Uint8Array> | null = null;
const fonts = new WeakMap<PDFDocument, Promise<PDFFont>>();

/** Lee el archivo de Arvo Bold una sola vez. Si falla no se guarda el intento, para poder reintentar. */
const loadFontBytes = (): Promise<Uint8Array> => {
  if (!fontBytes) {
    fontBytes = (async () => {
      const response = await fetch(arvoBoldUrl);
      if (!response.ok) throw new Error(`Font request failed: ${response.status}`);
      return new Uint8Array(await response.arrayBuffer());
    })().catch((error: unknown) => {
      fontBytes = null;
      throw error;
    });
  }
  return fontBytes;
};

const embedTitleFont = async (pdfDoc: PDFDocument): Promise<PDFFont> => {
  try {
    const bytes = await loadFontBytes();
    // fontkit pesa mucho: se descarga solo cuando se arma un PDF.
    const { default: fontkit } = await import('@pdf-lib/fontkit');
    pdfDoc.registerFontkit(fontkit);
    return await pdfDoc.embedFont(bytes);
  } catch (error) {
    logger.warn('Could not load the board title font, using Helvetica Bold:', error);
    return pdfDoc.embedFont(StandardFonts.HelveticaBold);
  }
};

/**
 * Letra del título de los tableros: Arvo Bold, la misma de las cartas, incrustada una vez por documento.
 * Si no se puede cargar, el título sale en Helvetica Bold en vez de quedarse sin título.
 */
export const getBoardTitleFont = (pdfDoc: PDFDocument): Promise<PDFFont> => {
  const embedded = fonts.get(pdfDoc);
  if (embedded) return embedded;

  const embedding = embedTitleFont(pdfDoc);
  fonts.set(pdfDoc, embedding);
  return embedding;
};
