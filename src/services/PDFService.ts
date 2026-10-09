import { PDFDocument } from 'pdf-lib';
import { Board, Card } from '../types';
import { loadCards } from '../utils/storage';
import { blobToBase64, getImageBlob, cacheImageBlob } from '../utils/indexedDB';
import { CardRepository } from '../repositories/CardRepository';
import { logger } from '../utils/logger';
import { PAGE_HEIGHT_PT, PAGE_WIDTH_PT } from './pdf/constants';
import { EmbedResult, urlToBase64 } from './pdf/images';
import { drawBoardOnPage, drawDeckPages } from './pdf/draw';
import { createOnceLoader } from './pdf/loadOnce';
import { PdfCardsFailedError, uniqueFailedCards } from './pdf/failedCards';

export { downloadPDF } from './pdf/download';
export { pdfFileName } from './pdf/fileName';

export interface GeneratePDFOptions {
  /** Cartas para la sección "Baraja Completa". Si no se pasa, se usa loadCards() (invitados). */
  allCards?: Card[];
  /** Cartas que ya traen su nombre dibujado (lotería de temporada, FEAT-23): van enteras y sin título. */
  finishedCards?: boolean;
  /** Nombre de la lotería: queda como título del PDF (el que muestran los lectores en la pestaña). */
  title?: string;
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

  // Lee la imagen de una carta: primero la copia local (IndexedDB), luego Storage, luego la que trae la carta.
  const readCardImage = async (card: Card): Promise<string | null> => {
    try {
      const blob = await getImageBlob(card.id);
      if (blob) return await blobToBase64(blob);

      if (card.imagePath) {
        const downloaded = await CardRepository.downloadImage(card.imagePath);
        try {
          await cacheImageBlob(card.id, downloaded);
        } catch (_) {
          // La caché local es opcional: si falla, se sigue con la imagen descargada.
        }
        return await blobToBase64(downloaded);
      }
      if (card.image) {
        if (card.image.startsWith('http://') || card.image.startsWith('https://') || card.image.startsWith('blob:')) {
          return await urlToBase64(card.image);
        }
        if (card.image.startsWith('data:')) return card.image;
      }
    } catch (error) {
      logger.error(`PDF: error getting image for card ${card.id}:`, error);
    }
    return null;
  };

  // Una sola lectura por carta, aunque aparezca en varios tableros y todos la pidan a la vez.
  const loadOnce = createOnceLoader<string>();
  const getBase64ForPDF = (card: Card): Promise<string | null> =>
    card.id ? loadOnce(card.id, () => readCardImage(card)) : Promise.resolve(null);

  const refreshedBoards: Board[] = await Promise.all(
    boards.map(async (board) => {
      const refreshedCards = await Promise.all(
        board.cards.map(async (card) => {
          if (card.id) {
            const base64Image = await getBase64ForPDF(card);
            if (base64Image) return { ...card, image: base64Image };
          }
          return card;
        })
      );
      return { ...board, cards: refreshedCards };
    })
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
  let allCards: Card[] = options?.allCards ?? (await loadCards());
  if (allCards.length > 0) {
    allCards = await Promise.all(
      allCards.map(async (card) => {
        if (card.id) {
          const base64Image = await getBase64ForPDF(card);
          if (base64Image) return { ...card, image: base64Image };
        }
        return card;
      })
    );
  }

  failedCards.push(...(await drawDeckPages(pdfDoc, allCards, embedCache, finishedCards)));

  if (failedCards.length > 0) throw new PdfCardsFailedError(uniqueFailedCards(failedCards));

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes as BlobPart], { type: 'application/pdf' });
};
