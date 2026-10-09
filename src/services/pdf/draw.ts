import { PDFDocument, rgb, StandardFonts, type PDFFont, pushGraphicsState, popGraphicsState, rectangle, clip, endPath, type PDFPage } from 'pdf-lib';
import { Board, Card } from '../../types';
import { logger } from '../../utils/logger';
import { printableCardTitle } from '../../utils/cardTitle';
import logoImage from '../../img/logo.png';
import { BOARD_HEIGHT_PT, BOARD_WIDTH_PT, CARD_GAP_PT, CUT_AREA_BLEED_PT, CUT_AREA_HEIGHT_PT, CUT_AREA_WIDTH_PT, CUT_AREA_X_PT, CUT_AREA_Y_PT, HEADER_GAP_PT, LOGO_HEIGHT_PT, MIN_TITLE_SIZE_PT } from './constants';
import { EmbedResult, embedImageInPDF } from './images';
import { cutGuides, deckCutGuides, placeImageInCard, titleBaselineOffset, titleSpaceFor, type CardImageFit, type DeckGridLayout } from './layout';

export const titleFontCache = new WeakMap<PDFDocument, PDFFont>();
export const getTitleFont = async (pdfDoc: PDFDocument): Promise<PDFFont> => {
  const cached = titleFontCache.get(pdfDoc);
  if (cached) return cached;
  // Nota: pdf-lib no incluye una “fuente de lotería” por defecto; usamos una estándar consistente y medible.
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  titleFontCache.set(pdfDoc, font);
  return font;
};

export const normalizeTitle = (title: string) =>
  title.replace(/\s+/g, ' ').trim().toUpperCase();

export const fitTextToWidth = (
  text: string,
  font: PDFFont,
  maxWidth: number,
  preferredSize: number,
  minSize: number
): { text: string; size: number; width: number } => {
  let size = preferredSize;
  let width = font.widthOfTextAtSize(text, size);

  // Reduce tamaño hasta que quepa (con decremento fino para ajustar mejor el centrado)
  while (width > maxWidth && size > minSize) {
    size = Math.max(minSize, size - 0.5);
    width = font.widthOfTextAtSize(text, size);
  }

  if (width <= maxWidth) return { text, size, width };

  // Si aún no cabe, truncar con ellipsis
  const ellipsis = '…';
  const ellipsisWidth = font.widthOfTextAtSize(ellipsis, size);
  const target = Math.max(0, maxWidth - ellipsisWidth);

  let lo = 0;
  let hi = text.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    const candidate = text.slice(0, mid);
    const w = font.widthOfTextAtSize(candidate, size);
    if (w <= target) lo = mid;
    else hi = mid - 1;
  }

  const truncated = text.slice(0, Math.max(0, lo)).trimEnd();
  const finalText = truncated.length ? `${truncated}${ellipsis}` : ellipsis;
  const finalWidth = font.widthOfTextAtSize(finalText, size);
  return { text: finalText, size, width: finalWidth };
};

/**
 * Dibuja una carta. Devuelve `false` si no se pudo (no tiene imagen o la imagen no cargó):
 * quien llama decide qué hacer; aquí no se dibuja nada en su lugar.
 */
export const drawCardOnPage = async (
  page: PDFPage,
  card: Card,
  x: number,
  y: number,
  width: number,
  height: number,
  pdfDoc: PDFDocument,
  showTitle: boolean = true,
  titleSize: number = 8,
  embedCache?: Map<string, EmbedResult>,
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

    // Reserve space for title if showing (more space for larger fonts)
    const titleSpace = showTitle ? titleSpaceFor(titleSize) : 0;
    const imageAreaHeight = height - titleSpace;

    // 'cover' llena la casilla y recorta lo que sobra; 'contain' deja la imagen entera, centrada.
    const {
      offsetX,
      offsetY,
      width: scaledWidth,
      height: scaledHeight,
    } = placeImageInCard(imgWidth, imgHeight, width, height, titleSpace, fit);

    // Clip image to the image area so it never overflows the card bounds
    page.pushOperators(
      pushGraphicsState(),
      rectangle(x, y + titleSpace, width, imageAreaHeight),
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

    // Draw title at bottom of card (centered, inside card area)
    if (showTitle) {
      const font = await getTitleFont(pdfDoc);
      // Las cartas guardadas antes de la regla del nombre pueden traer emojis: se dibujan sin ellos.
      const rawTitle = normalizeTitle(printableCardTitle(card.title || ''));
      const titlePaddingX = 6;
      const maxTextWidth = Math.max(0, width - titlePaddingX * 2);

      // Si llega vacío, no dibujamos nada
      if (rawTitle) {
        // Ajustes: un poco más pequeño en general y con mínimo para legibilidad
        const preferred = Math.max(MIN_TITLE_SIZE_PT, titleSize - 1);
        const minSize = MIN_TITLE_SIZE_PT;

        const fitted = fitTextToWidth(
          rawTitle,
          font,
          maxTextWidth,
          preferred,
          minSize
        );

        // Fondo del título (debajo del borde; el borde se dibuja al final).
        // Mide lo mismo que el espacio reservado, para que llegue hasta donde termina la foto.
        page.drawRectangle({
          x,
          y,
          width,
          height: titleSpace,
          color: rgb(1, 1, 1),
          borderWidth: 0,
        });

        const titleY = y + titleBaselineOffset(titleSpace, fitted.size);
        const titleX = x + titlePaddingX + (maxTextWidth - fitted.width) / 2;

        page.drawText(fitted.text, {
          x: titleX,
          y: titleY,
          size: fitted.size,
          font,
          color: rgb(0, 0, 0),
        });
      }
    }

    // Draw card border LAST so the title background never covers it
    page.drawRectangle({
      x: x,
      y: y,
      width: width,
      height: height,
      borderColor: rgb(0, 0, 0),
      borderWidth: 2,
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
export const drawDeckCutGuides = (page: PDFPage, deck: DeckGridLayout, cardCount: number) => {
  const { lines, marks } = deckCutGuides(deck, cardCount);

  for (const line of lines) {
    page.drawLine({ ...line, color: CUT_GUIDE_COLOR, thickness: CUT_GUIDE_THICKNESS, dashArray: CUT_GUIDE_DASH });
  }
  for (const mark of marks) {
    page.drawLine({ ...mark, color: CUT_GUIDE_COLOR, thickness: CUT_GUIDE_THICKNESS });
  }
};

export const drawBoardOnPage = async (
  page: PDFPage,
  board: Board,
  boardNumber: number,
  pdfDoc: PDFDocument,
  embedCache?: Map<string, EmbedResult>,
  /** Cartas que ya traen su nombre dibujado (lotería de temporada): van enteras y sin título. */
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
  // Title and Logo position: same level Y, just above board
  const titleSize = 12;
  const titleY = boardY + BOARD_HEIGHT_PT + HEADER_GAP_PT + titleSize / 2;
  // Logo at same Y level as title (centered vertically with title text)
  const logoY = titleY - titleSize / 2; // Align logo center with title baseline

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

  // Draw board title (left-aligned, just above board)
  const titleText = `Tablero ${boardNumber}`;
  const titleX = CUT_AREA_X_PT + 10; // Left padding within cut area

  page.drawText(titleText, {
    x: titleX,
    y: titleY,
    size: titleSize,
    color: rgb(0, 0, 0),
  });

  // Draw logo at same level as title (right side of cut area)
  try {
    const logoSize = LOGO_HEIGHT_PT; // Logo height in points (calculated to fit in max header)
    const { image: logoImageEmbed, width: logoWidth, height: logoHeight } = await getLogoImage(pdfDoc);
    const logoAspectRatio = logoWidth / logoHeight;
    const logoDisplayWidth = logoSize * logoAspectRatio;
    const logoDisplayHeight = logoSize;

    // Position logo at right side of cut area, at same Y level as title
    const logoX = CUT_AREA_X_PT + CUT_AREA_WIDTH_PT - logoDisplayWidth - 10; // Right padding

    page.drawImage(logoImageEmbed, {
      x: logoX,
      y: logoY,
      width: logoDisplayWidth,
      height: logoDisplayHeight,
    });
  } catch (error) {
    logger.warn('Could not draw logo on board:', error);
    // Continue without logo if there's an error
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
          !finishedCards, // showTitle
          gridSize === 9 ? 14 : 11, // Larger title for 3x3 cards
          embedCache,
          finishedCards ? 'contain' : 'cover'
        );
        if (!drawn) failedCards.push(card);
      }
    }
  }

  return failedCards;
};
