import { PDFDocument, rgb } from 'pdf-lib';
import { Board, Card } from '../types';
import { loadCards } from '../utils/storage';
import { blobToBase64, getImageBlob, cacheImageBlob } from '../utils/indexedDB';
import { CardRepository } from '../repositories/CardRepository';
import { logger } from '../utils/logger';
import { PAGE_HEIGHT_PT, PAGE_WIDTH_PT } from './pdf/constants';
import { EmbedResult, urlToBase64 } from './pdf/images';
import { drawBoardOnPage, drawCardOnPage, drawDeckCutGuides } from './pdf/draw';
import { deckGridLayout } from './pdf/layout';
import { createOnceLoader } from './pdf/loadOnce';
import { PdfCardsFailedError, uniqueFailedCards } from './pdf/failedCards';

export interface GeneratePDFOptions {
  /** Cartas para la sección "Baraja Completa". Si no se pasa, se usa loadCards() (invitados). */
  allCards?: Card[];
  /** Cartas que ya traen su nombre dibujado (lotería de temporada, FEAT-23): van enteras y sin título. */
  finishedCards?: boolean;
}

/**
 * Arma el PDF de tableros y baraja. Si alguna carta no se puede dibujar, no devuelve un PDF incompleto:
 * lanza `PdfCardsFailedError` con las cartas que fallaron.
 */
export const generatePDF = async (boards: Board[], options?: GeneratePDFOptions): Promise<Blob> => {
  const pdfDoc = await PDFDocument.create();
  const finishedCards = options?.finishedCards ?? false;

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

  if (allCards.length > 0) {
    const deck = deckGridLayout();
    const cardsPerPage = deck.cols * deck.rows;

    let pageNumber = 1;
    for (let start = 0; start < allCards.length; start += cardsPerPage) {
      const cardsPage = pdfDoc.addPage([deck.pageWidth, deck.pageHeight]);
      const titleText =
        pageNumber === 1 ? 'Baraja Completa' : `Baraja Completa (continuación - Página ${pageNumber})`;
      cardsPage.drawText(titleText, {
        x: 30,
        y: deck.titleY,
        size: 12,
        color: rgb(0, 0, 0),
      });

      const chunk = allCards.slice(start, start + cardsPerPage);
      drawDeckCutGuides(cardsPage, deck, chunk.length);
      for (let idx = 0; idx < chunk.length; idx++) {
        const row = Math.floor(idx / deck.cols);
        const col = idx % deck.cols;

        const cardX = deck.startX + col * (deck.cardWidth + deck.gap);
        const cardY = deck.topY - deck.cardHeight - row * (deck.cardHeight + deck.gap);

        const drawn = await drawCardOnPage(
          cardsPage,
          chunk[idx],
          cardX,
          cardY,
          deck.cardWidth,
          deck.cardHeight,
          pdfDoc,
          !finishedCards,
          11, // titleSize (same as boards for consistency)
          embedCache,
          finishedCards ? 'contain' : 'cover'
        );
        if (!drawn) failedCards.push(chunk[idx]);
      }

      pageNumber++;
    }
  }

  if (failedCards.length > 0) throw new PdfCardsFailedError(uniqueFailedCards(failedCards));

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes as BlobPart], { type: 'application/pdf' });
};

export const downloadPDF = (blob: Blob, filename: string = 'loteria-tableros.pdf') => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Generate PDF for a single card
 */
export const generateCardPDF = async (card: Card): Promise<Blob> => {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([PAGE_WIDTH_PT, PAGE_HEIGHT_PT]);

  // Calculate card size to fit nicely on page (centered, with margins)
  const margin = 60;
  const availableWidth = PAGE_WIDTH_PT - (margin * 2);
  const availableHeight = PAGE_HEIGHT_PT - (margin * 2);

  // Use traditional loteria card aspect ratio (7cm x 11cm = 7:11)
  const cardAspectRatio = 7 / 11;
  let cardWidth = availableWidth;
  let cardHeight = cardWidth / cardAspectRatio;

  if (cardHeight > availableHeight) {
    cardHeight = availableHeight;
    cardWidth = cardHeight * cardAspectRatio;
  }

  // Center the card on the page
  const cardX = (PAGE_WIDTH_PT - cardWidth) / 2;
  const cardY = (PAGE_HEIGHT_PT - cardHeight) / 2;

  // Draw the card
  const drawn = await drawCardOnPage(
    page,
    card,
    cardX,
    cardY,
    cardWidth,
    cardHeight,
    pdfDoc,
    true, // showTitle
    12 // titleSize
  );
  if (!drawn) throw new PdfCardsFailedError([card]);

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes as BlobPart], { type: 'application/pdf' });
};
