import { PDFDocument, rgb, pushGraphicsState, popGraphicsState, rectangle, clip, endPath, type PDFPage } from 'pdf-lib';
import { Board, Card } from '../../types';
import { logger } from '../../utils/logger';
import logoImage from '../../img/logo.png';
import { BOARD_HEIGHT_PT, BOARD_TITLE_LINE_THICKNESS_PT, BOARD_TITLE_SIZE_PT, BOARD_WIDTH_PT, CARD_BORDER_PT, CARD_GAP_PT, CUT_AREA_BLEED_PT, CUT_AREA_HEIGHT_PT, CUT_AREA_WIDTH_PT, CUT_AREA_X_PT, CUT_AREA_Y_PT, DECK_TITLE_SIZE_PT } from './constants';
import { EmbedResult, embedImageInPDF } from './images';
import { boardLogoBox, boardPageTitle, boardTitleLayout, cutGuides, deckCardPosition, deckCutGuides, deckGridLayout, deckPages, deckPageTitle, placeImageInCard, type CardImageFit, type DeckGridLayout } from './layout';
import { getBoardTitleFont } from './titleFont';

/**
 * Dibuja una carta: su imagen ya trae el nombre dentro. Devuelve `false` si no se pudo (no tiene imagen
 * o la imagen no cargó): quien llama decide qué hacer; aquí no se dibuja nada en su lugar.
 */
export const drawCardOnPage = async (
  page: PDFPage,
  card: Card,
  x: number,
  y: number,
  width: number,
  height: number,
  pdfDoc: PDFDocument,
  embedCache?: Map<string, EmbedResult>,
  /** 'cover' llena la casilla y recorta lo que sobra; 'contain' deja la imagen entera, centrada. */
  fit: CardImageFit = 'cover'
): Promise<boolean> => {
  try {
    if (!card.image) {
      logger.error(`Card ${card.id} has no image to draw`);
      return false;
    }

    const { image, width: imgWidth, height: imgHeight } = await embedImageInPDF(
      pdfDoc,
      card.image,
      embedCache,
      card.id || undefined
    );

    const {
      offsetX,
      offsetY,
      width: scaledWidth,
      height: scaledHeight,
    } = placeImageInCard(imgWidth, imgHeight, width, height, fit);

    // Clip image to the card so it never overflows its bounds
    page.pushOperators(
      pushGraphicsState(),
      rectangle(x, y, width, height),
      clip(),
      endPath(),
    );
    page.drawImage(image, {
      x: x + offsetX,
      y: y + offsetY,
      width: scaledWidth,
      height: scaledHeight,
    });
    page.pushOperators(popGraphicsState());

    page.drawRectangle({
      x: x,
      y: y,
      width: width,
      height: height,
      borderColor: rgb(0, 0, 0),
      borderWidth: CARD_BORDER_PT,
    });
    return true;
  } catch (error) {
    logger.error(`Error drawing card ${card.id}:`, error);
    logger.error(`Card title: ${card.title}`);
    logger.error(`Card image: ${card.image ? card.image.substring(0, 100) : 'null'}...`);
    if (error instanceof Error) {
      logger.error(`Error message: ${error.message}`);
      logger.error(`Error stack: ${error.stack}`);
    }
    return false;
  }
};

// Cache logo bytes globally and embed per PDF document
export const logoBytesCache: { data: Uint8Array } = { data: new Uint8Array() };
export const logoImageCache = new WeakMap<PDFDocument, EmbedResult>();

export const getLogoImage = async (pdfDoc: PDFDocument): Promise<EmbedResult> => {
  const cached = logoImageCache.get(pdfDoc);
  if (cached) {
    return cached;
  }

  try {
    if (logoBytesCache.data.length === 0) {
      const response = await fetch(logoImage);
      const arrayBuffer = await response.arrayBuffer();
      logoBytesCache.data = new Uint8Array(arrayBuffer);
    }

    // Embed logo per PDF document to avoid cross-document reuse
    const image = await pdfDoc.embedPng(logoBytesCache.data);
    const { width, height } = image.scale(1);
    const entry = { image, width, height };
    logoImageCache.set(pdfDoc, entry);
    return entry;
  } catch (error) {
    logger.error('Error loading logo image:', error);
    throw error;
  }
};

const CUT_GUIDE_COLOR = rgb(0.35, 0.35, 0.35);
const CUT_GUIDE_THICKNESS = 0.5;
const CUT_GUIDE_DASH = [3, 3];
// Casi negro (#1A120E): título del tablero y sus líneas
const BOARD_TITLE_COLOR = rgb(26 / 255, 18 / 255, 14 / 255);

/** Línea punteada por donde se recorta el tablero y marcas de corte en sus cuatro esquinas. */
const drawCutGuides = (page: PDFPage) => {
  const { line, marks } = cutGuides();

  page.drawRectangle({
    ...line,
    borderColor: CUT_GUIDE_COLOR,
    borderWidth: CUT_GUIDE_THICKNESS,
    borderDashArray: CUT_GUIDE_DASH,
  });

  for (const mark of marks) {
    page.drawLine({ ...mark, color: CUT_GUIDE_COLOR, thickness: CUT_GUIDE_THICKNESS });
  }
};

/** Líneas punteadas de corte entre las cartas de una página de la baraja, con una marca en cada extremo. */
const drawDeckCutGuides = (page: PDFPage, deck: DeckGridLayout, cardCount: number) => {
  const { lines, marks } = deckCutGuides(deck, cardCount);

  for (const line of lines) {
    page.drawLine({ ...line, color: CUT_GUIDE_COLOR, thickness: CUT_GUIDE_THICKNESS, dashArray: CUT_GUIDE_DASH });
  }
  for (const mark of marks) {
    page.drawLine({ ...mark, color: CUT_GUIDE_COLOR, thickness: CUT_GUIDE_THICKNESS });
  }
};

/** Agrega las páginas de «Baraja Completa». Devuelve las cartas que no se pudieron dibujar. */
export const drawDeckPages = async (
  pdfDoc: PDFDocument,
  cards: Card[],
  embedCache?: Map<string, EmbedResult>,
  /** Cartas de una lotería de temporada, que ya traen su nombre dibujado: van enteras. */
  finishedCards: boolean = false
): Promise<Card[]> => {
  const failedCards: Card[] = [];
  const deck = deckGridLayout();
  const pages = deckPages(cards, deck);

  for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
    const pageCards = pages[pageIndex];
    const page = pdfDoc.addPage([deck.pageWidth, deck.pageHeight]);
    page.drawText(deckPageTitle(pageIndex + 1), {
      x: deck.titleX,
      y: deck.titleY,
      size: DECK_TITLE_SIZE_PT,
      color: rgb(0, 0, 0),
    });
    drawDeckCutGuides(page, deck, pageCards.length);

    for (let index = 0; index < pageCards.length; index++) {
      const { x, y } = deckCardPosition(deck, index);
      const drawn = await drawCardOnPage(
        page,
        pageCards[index],
        x,
        y,
        deck.cardWidth,
        deck.cardHeight,
        pdfDoc,
        embedCache,
        finishedCards ? 'contain' : 'cover'
      );
      if (!drawn) failedCards.push(pageCards[index]);
    }
  }

  return failedCards;
};

export const drawBoardOnPage = async (
  page: PDFPage,
  board: Board,
  boardNumber: number,
  pdfDoc: PDFDocument,
  embedCache?: Map<string, EmbedResult>,
  /** Cartas de una lotería de temporada, que ya traen su nombre dibujado: van enteras. */
  finishedCards: boolean = false
): Promise<Card[]> => {
  const failedCards: Card[] = [];

  // Determine grid size (default to 4x4 if undefined)
  const gridSize = board.gridSize || 16;
  const rows = gridSize === 9 ? 3 : 4;
  const cols = gridSize === 9 ? 3 : 4;

  // Calculate card dimensions based on grid
  // Total gap space = (cols - 1) * CARD_GAP_PT
  const totalGapWidth = (cols - 1) * CARD_GAP_PT;
  const totalGapHeight = (rows - 1) * CARD_GAP_PT;
  const cardWidthPt = (BOARD_WIDTH_PT - totalGapWidth) / cols;
  const cardHeightPt = (BOARD_HEIGHT_PT - totalGapHeight) / rows;

  // Calculate positions within the cut area (centered on page)
  // Board position: bottom of cut area
  const boardY = CUT_AREA_Y_PT;
  const boardX = CUT_AREA_X_PT; // Same X as cut area

  // Draw semi-transparent background for the entire cut area (including header)
  // This creates a subtle, diffused background that doesn't overpower the white background
  // Using very light orange/coral tint that matches the app's color scheme (#fef3e7, #fed7aa)
  page.drawRectangle({
    x: boardX - CUT_AREA_BLEED_PT, // Extra padding around the cut area
    y: boardY - CUT_AREA_BLEED_PT,
    width: CUT_AREA_WIDTH_PT + CUT_AREA_BLEED_PT * 2,
    height: CUT_AREA_HEIGHT_PT + CUT_AREA_BLEED_PT * 2,
    color: rgb(0.995, 0.953, 0.906), // Very light orange-tinted background (similar to #fef3e7)
    borderColor: rgb(0.98, 0.92, 0.87), // Slightly darker border (similar to #fed7aa but lighter)
    borderWidth: 1,
  });

  drawCutGuides(page);

  // Logo centrado arriba del título
  try {
    const { image: logoImageEmbed, width: logoWidth, height: logoHeight } = await getLogoImage(pdfDoc);
    page.drawImage(logoImageEmbed, boardLogoBox(logoWidth / logoHeight));
  } catch (error) {
    logger.warn('Could not draw logo on board:', error);
    // Continue without logo if there's an error
  }

  // Título centrado sobre la cuadrícula, con una línea a cada lado
  const titleText = boardPageTitle(boardNumber);
  const titleFont = await getBoardTitleFont(pdfDoc);
  const title = boardTitleLayout(titleFont.widthOfTextAtSize(titleText, BOARD_TITLE_SIZE_PT));

  page.drawText(titleText, {
    ...title.text,
    size: BOARD_TITLE_SIZE_PT,
    font: titleFont,
    color: BOARD_TITLE_COLOR,
  });
  for (const line of title.lines) {
    page.drawLine({ ...line, color: BOARD_TITLE_COLOR, thickness: BOARD_TITLE_LINE_THICKNESS_PT });
  }

  // Draw each card in the grid (top to bottom, left to right)
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const cardIndex = row * cols + col;
      const card = board.cards[cardIndex];

      if (card) {
        // Calculate card position
        // Start from top-left (PDF coordinates: bottom-left is origin)
        const cardX = boardX + col * (cardWidthPt + CARD_GAP_PT);
        // Invert row: row 0 is at top, so we use (rows - 1 - row)
        const cardY = boardY + (rows - 1 - row) * (cardHeightPt + CARD_GAP_PT);

        const drawn = await drawCardOnPage(
          page,
          card,
          cardX,
          cardY,
          cardWidthPt,
          cardHeightPt,
          pdfDoc,
          embedCache,
          finishedCards ? 'contain' : 'cover'
        );
        if (!drawn) failedCards.push(card);
      }
    }
  }

  return failedCards;
};
