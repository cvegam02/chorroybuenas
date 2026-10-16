/**
 * El PDF de una lotería temática armada con cartas ya terminadas (FEAT-23; FEAT-48 lo usa en el asistente):
 * los tableros y después la baraja para recortar, con las cartas completas y sin nombre escrito.
 */
import type { Board, Card } from '../types';
import { logger } from '../utils/logger';
import { SEASONAL_PDF_MIME_TYPE, formatFileSize, seasonalPdfFileName, validatePdfFile } from '../utils/seasonalLoteria';
import { generatePDF } from './PDFService';
import { PdfCardsFailedError, formatFailedCardNames } from './pdf/failedCards';

export interface SeasonalPdfCard {
  id: string;
  /** Dirección de la imagen, local o firmada. */
  url: string;
  fileName: string;
}

export type SeasonalPdfResult = { file: File } | { error: string };

/** Las cartas ya traen su nombre dibujado: van al PDF sin título. */
const toPdfCard = (card: SeasonalPdfCard): Card => ({ id: card.id, title: '', image: card.url });

/** En el aviso, las cartas se identifican por el nombre de su archivo. */
function failedCardsMessage(error: PdfCardsFailedError, cards: readonly SeasonalPdfCard[]): string {
  const fileNames = error.failedCards.map((failed) => cards.find((card) => card.id === failed.id)?.fileName ?? failed.id);
  const count = fileNames.length;
  const summary = count === 1 ? '1 carta no cargó' : `${count} cartas no cargaron`;
  return `No se pudo crear el PDF: ${summary} (${formatFailedCardNames(fileNames)}). Revisa tu conexión e inténtalo de nuevo.`;
}

export async function buildSeasonalPdf(
  cards: readonly SeasonalPdfCard[],
  boards: readonly (readonly SeasonalPdfCard[])[],
  gridSize: 9 | 16,
  name: string,
): Promise<SeasonalPdfResult> {
  let file: File;
  try {
    const pdfBoards: Board[] = boards.map((board, index) => ({
      id: `tablero-${index + 1}`,
      cards: board.map(toPdfCard),
      gridSize,
    }));
    const blob = await generatePDF(pdfBoards, { allCards: cards.map(toPdfCard), finishedCards: true, title: name });
    file = new File([blob], seasonalPdfFileName(name), { type: SEASONAL_PDF_MIME_TYPE });
  } catch (buildError) {
    logger.error('Lotería temática: no se pudo armar el PDF:', buildError);
    if (buildError instanceof PdfCardsFailedError) return { error: failedCardsMessage(buildError, cards) };
    return { error: 'No se pudo armar el PDF. Tus cartas y tableros siguen aquí: intenta de nuevo.' };
  }

  const rejection = validatePdfFile(file);
  if (rejection) {
    return { error: `El PDF quedó de ${formatFileSize(file.size)}. ${rejection} Genera menos tableros y vuelve a intentar.` };
  }
  return { file };
}
