import { PDFDocument } from 'pdf-lib';
import { Board, Card } from '../types';
import { loadCards } from '../utils/storage';
import { PAGE_HEIGHT_PT, PAGE_WIDTH_PT } from './pdf/constants';
import { EmbedResult } from './pdf/images';
import { drawBoardOnPage, drawDeckPages } from './pdf/draw';
import { createOnceLoader } from './pdf/loadOnce';
import { PdfCardsFailedError, uniqueFailedCards } from './pdf/failedCards';
import { createCardPreparer } from './pdf/prepareCards';
import { composeCard } from './cardCompose/compose';
import type { CardComposer } from './cardCompose/input';
import { readStoredCardImage } from './cardImage';

export { downloadPDF } from './pdf/download';
export { pdfFileName } from './pdf/fileName';

export interface GeneratePDFOptions {
  /** Cartas para la sección "Baraja Completa". Si no se pasa, se usa loadCards() (invitados). */
  allCards?: Card[];
  /** Cartas que ya traen su nombre dibujado (lotería de temporada, FEAT-23): van enteras y no se componen. */
  finishedCards?: boolean;
  /** Nombre de la lotería: queda como título del PDF (el que muestran los lectores en la pestaña). */
  title?: string;
  /** Cómo se compone cada carta (foto, marco y nombre). Por defecto, en el navegador. */
  composeCard?: CardComposer;
}

/**
 * Arma el PDF de tableros y baraja. Si alguna carta no se puede dibujar, no devuelve un PDF incompleto:
 * lanza `PdfCardsFailedError` con las cartas que fallaron.
 */
export const generatePDF = async (boards: Board[], options?: GeneratePDFOptions): Promise<Blob> => {
  const pdfDoc = await PDFDocument.create();
  const finishedCards = options?.finishedCards ?? false;
  const title = options?.title?.trim();
  if (title) pdfDoc.setTitle(title, { showInWindowTitleBar: true });

  // Una sola lectura por carta, aunque aparezca en varios tableros y todos la pidan a la vez.
  const loadOnce = createOnceLoader<string>();
  const getBase64ForPDF = (card: Card): Promise<string | null> =>
    card.id ? loadOnce(card.id, () => readStoredCardImage(card)) : Promise.resolve(null);

  const prepareCard = createCardPreparer({
    readImage: getBase64ForPDF,
    compose: options?.composeCard ?? composeCard,
    finishedCards,
  });

  const refreshedBoards: Board[] = await Promise.all(
    boards.map(async (board) => ({ ...board, cards: await Promise.all(board.cards.map(prepareCard)) }))
  );

  // Caché por card.id: cada imagen se decodifica/embebe una sola vez (evita 160+ decodificaciones cuando hay 10 tableros)
  const embedCache = new Map<string, EmbedResult>();
  const failedCards: Card[] = [];

  for (let i = 0; i < refreshedBoards.length; i++) {
    const board = refreshedBoards[i];
    const page = pdfDoc.addPage([PAGE_WIDTH_PT, PAGE_HEIGHT_PT]);

    failedCards.push(...(await drawBoardOnPage(page, board, i + 1, pdfDoc, embedCache, finishedCards)));
  }

  // Optionally add pages with all cards (full deck)
  // Usar allCards pasadas (usuario logueado) o loadCards() (invitados)
  const allCards: Card[] = await Promise.all((options?.allCards ?? (await loadCards())).map(prepareCard));

  failedCards.push(...(await drawDeckPages(pdfDoc, allCards, embedCache, finishedCards)));

  if (failedCards.length > 0) throw new PdfCardsFailedError(uniqueFailedCards(failedCards));

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes as BlobPart], { type: 'application/pdf' });
};
