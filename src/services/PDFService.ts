import { PDFDocument, rgb } from 'pdf-lib';
import { Board, Card } from '../types';
import { loadCards } from '../utils/storage';
import { blobToBase64, getImageBlob, cacheImageBlob } from '../utils/indexedDB';
import { CardRepository } from '../repositories/CardRepository';
import { logger } from '../utils/logger';
import { PAGE_HEIGHT_PT, PAGE_WIDTH_PT, cmToPoints } from './pdf/constants';
import { EmbedResult, urlToBase64 } from './pdf/images';
import { drawBoardOnPage, drawCardOnPage } from './pdf/draw';

export interface GeneratePDFOptions {
  /** Cartas para la sección "Baraja Completa". Si no se pasa, se usa loadCards() (invitados). */
  allCards?: Card[];
}

export const generatePDF = async (boards: Board[], options?: GeneratePDFOptions): Promise<Blob> => {
  const pdfDoc = await PDFDocument.create();

  // Una sola lectura/conversión por carta: caché base64 por card.id (IndexedDB ya tiene el blob tras prefetch)
  const base64Cache = new Map<string, string>();

  const getBase64ForPDF = async (card: Card): Promise<string | null> => {
    if (!card.id) return null;
    const cached = base64Cache.get(card.id);
    if (cached) return cached;

    try {
      const blob = await getImageBlob(card.id);
      if (blob) {
        const base64 = await blobToBase64(blob);
        base64Cache.set(card.id, base64);
        return base64;
      }
      if (card.imagePath) {
        const downloaded = await CardRepository.downloadImage(card.imagePath);
        try {
          await cacheImageBlob(card.id, downloaded);
        } catch (_) {
          // La caché local es opcional: si falla, se sigue con la imagen descargada.
        }
        const base64 = await blobToBase64(downloaded);
        base64Cache.set(card.id, base64);
        return base64;
      }
      if (card.image) {
        if (card.image.startsWith('http://') || card.image.startsWith('https://') || card.image.startsWith('blob:')) {
          const base64 = await urlToBase64(card.image);
          base64Cache.set(card.id, base64);
          return base64;
        }
        if (card.image.startsWith('data:')) {
          base64Cache.set(card.id, card.image);
          return card.image;
        }
      }
    } catch (error) {
      logger.error(`PDF: error getting image for card ${card.id}:`, error);
    }
    return null;
  };

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

  for (let i = 0; i < refreshedBoards.length; i++) {
    const board = refreshedBoards[i];
    const page = pdfDoc.addPage([PAGE_WIDTH_PT, PAGE_HEIGHT_PT]);

    await drawBoardOnPage(page, board, i + 1, pdfDoc, embedCache);
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
    // Full deck pages: use LANDSCAPE to reduce wasted whitespace while keeping safe gaps for cutting.
    // We compute a fixed grid (cols/rows) and then center it on the page.
    const DECK_PAGE_W = PAGE_HEIGHT_PT; // landscape width
    const DECK_PAGE_H = PAGE_WIDTH_PT; // landscape height

    // Cutting-friendly spacing (gap between cards) and margins
    const DECK_GAP = cmToPoints(0.4); // ~11pt
    const DECK_MARGIN_X = 30;
    const DECK_MARGIN_TOP = 26;
    const DECK_MARGIN_BOTTOM = 26;
    const DECK_HEADER_H = 26; // smaller header to save space

    // Card aspect ratio (5:7.5 = 2/3 = 0.666...) - matches the actual card aspect ratio
    const DECK_ASPECT = 5 / 7.5; // width / height (same as cards in boards)

    // Grid configuration: 5x2 in landscape usually maximizes usage with safe cut gaps.
    const DECK_COLS = 5;
    const DECK_ROWS = 2;
    const CARDS_PER_PAGE = DECK_COLS * DECK_ROWS;

    const availableW = DECK_PAGE_W - (DECK_MARGIN_X * 2) - (DECK_COLS - 1) * DECK_GAP;
    const availableH =
      DECK_PAGE_H - DECK_MARGIN_TOP - DECK_HEADER_H - DECK_MARGIN_BOTTOM - (DECK_ROWS - 1) * DECK_GAP;

    let deckCardW = availableW / DECK_COLS;
    let deckCardH = deckCardW / DECK_ASPECT;
    const maxCardH = availableH / DECK_ROWS;

    // If height is the limiting factor, shrink width to match height
    if (deckCardH > maxCardH) {
      deckCardH = maxCardH;
      deckCardW = deckCardH * DECK_ASPECT;
    }

    const gridW = DECK_COLS * deckCardW + (DECK_COLS - 1) * DECK_GAP;
    const gridStartX = (DECK_PAGE_W - gridW) / 2;
    const topY = DECK_PAGE_H - DECK_MARGIN_TOP - DECK_HEADER_H;

    let pageNumber = 1;
    for (let start = 0; start < allCards.length; start += CARDS_PER_PAGE) {
      const cardsPage = pdfDoc.addPage([DECK_PAGE_W, DECK_PAGE_H]);
      const titleText =
        pageNumber === 1 ? 'Baraja Completa' : `Baraja Completa (continuación - Página ${pageNumber})`;
      cardsPage.drawText(titleText, {
        x: 30,
        y: DECK_PAGE_H - 18,
        size: 12,
        color: rgb(0, 0, 0),
      });

      const chunk = allCards.slice(start, start + CARDS_PER_PAGE);
      for (let idx = 0; idx < chunk.length; idx++) {
        const row = Math.floor(idx / DECK_COLS);
        const col = idx % DECK_COLS;

        const cardX = gridStartX + col * (deckCardW + DECK_GAP);
        const cardY = topY - deckCardH - row * (deckCardH + DECK_GAP);

        await drawCardOnPage(
          cardsPage,
          chunk[idx],
          cardX,
          cardY,
          deckCardW,
          deckCardH,
          pdfDoc,
          true,
          11, // titleSize (same as boards for consistency)
          embedCache
        );
      }

      pageNumber++;
    }
  }

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
  await drawCardOnPage(
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

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes as BlobPart], { type: 'application/pdf' });
};
