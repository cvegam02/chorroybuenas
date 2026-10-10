import type { TFunction } from 'i18next';
import { PdfCardsFailedError, formatFailedCardNames } from '../services/pdf/failedCards';

/** Texto del aviso cuando no se pudo crear el PDF: si fue por cartas que no cargaron, dice cuántas y cuáles. */
export function pdfErrorMessage(error: unknown, t: TFunction): string {
  if (error instanceof PdfCardsFailedError) {
    return t('boardGenerator.errors.pdfCardsFailed', {
      count: error.failedCards.length,
      names: formatFailedCardNames(error.failedCards.map((card) => card.title)),
    });
  }
  return t('boardGenerator.errors.pdfError');
}
