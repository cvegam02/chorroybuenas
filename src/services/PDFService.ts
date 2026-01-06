import { PDFDocument, rgb, StandardFonts, type PDFFont } from 'pdf-lib';
import { Board, Card } from '../types';
import { loadCards } from '../utils/storage';
import { blobToBase64 } from '../utils/indexedDB';

// Convert cm to points (1 cm = 28.35 points)
const cmToPoints = (cm: number) => cm * 28.35;

// Page dimensions (A4: 210mm x 297mm = 21cm x 29.7cm)
const PAGE_WIDTH_PT = cmToPoints(21);  // 595.35pt
const PAGE_HEIGHT_PT = cmToPoints(29.7); // 842.0pt

// Margins
const PAGE_MARGIN_TOP_PT = 60; // Space for title
const PAGE_MARGIN_BOTTOM_PT = 40; // Space at bottom
const PAGE_MARGIN_SIDES_PT = 40; // Space on sides

// Available space for board
const AVAILABLE_WIDTH_PT = PAGE_WIDTH_PT - (PAGE_MARGIN_SIDES_PT * 2);
const AVAILABLE_HEIGHT_PT = PAGE_HEIGHT_PT - PAGE_MARGIN_TOP_PT - PAGE_MARGIN_BOTTOM_PT;

// Board has 4x4 cards
const BOARD_COLS = 4;
const BOARD_ROWS = 4;

// Gap between cards (small gap)
const CARD_GAP_PT = cmToPoints(0.15); // ~4.25pt

// Calculate card dimensions to fit in available space
// Total gap space = (BOARD_COLS - 1) * CARD_GAP_PT
const TOTAL_GAP_WIDTH = (BOARD_COLS - 1) * CARD_GAP_PT;
const TOTAL_GAP_HEIGHT = (BOARD_ROWS - 1) * CARD_GAP_PT;
const CARD_WIDTH_PT = (AVAILABLE_WIDTH_PT - TOTAL_GAP_WIDTH) / BOARD_COLS;
const CARD_HEIGHT_PT = (AVAILABLE_HEIGHT_PT - TOTAL_GAP_HEIGHT) / BOARD_ROWS;

// Board dimensions
const BOARD_WIDTH_PT = CARD_WIDTH_PT * BOARD_COLS + TOTAL_GAP_WIDTH;
const BOARD_HEIGHT_PT = CARD_HEIGHT_PT * BOARD_ROWS + TOTAL_GAP_HEIGHT;

interface ImageData {
  data: Uint8Array;
  width: number;
  height: number;
}

const titleFontCache = new WeakMap<PDFDocument, PDFFont>();
const getTitleFont = async (pdfDoc: PDFDocument): Promise<PDFFont> => {
  const cached = titleFontCache.get(pdfDoc);
  if (cached) return cached;
  // Nota: pdf-lib no incluye una “fuente de lotería” por defecto; usamos una estándar consistente y medible.
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  titleFontCache.set(pdfDoc, font);
  return font;
};

const normalizeTitle = (title: string) =>
  title.replace(/\s+/g, ' ').trim().toUpperCase();

const fitTextToWidth = (
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
 * Converts blob URL to base64 for PDF generation
 */
const blobURLToBase64 = async (blobURL: string): Promise<string> => {
  try {
    const response = await fetch(blobURL);
    const blob = await response.blob();
    return await blobToBase64(blob);
  } catch (error) {
    console.error('Error converting blob URL to base64:', error);
    throw error;
  }
};

const loadImageAsUint8Array = async (imageSrc: string): Promise<ImageData> => {
  let base64Image: string;
  
  // If it's a blob URL, convert to base64 first
  if (imageSrc.startsWith('blob:')) {
    base64Image = await blobURLToBase64(imageSrc);
  } else {
    base64Image = imageSrc;
  }
  
  // Remove data URL prefix if present
  const base64Data = base64Image.includes(',') 
    ? base64Image.split(',')[1] 
    : base64Image;
  
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  // Create image to get dimensions
  const img = new Image();
  img.src = base64Image;
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
  });
  
  return {
    data: bytes,
    width: img.width,
    height: img.height,
  };
};

const embedImageInPDF = async (
  pdfDoc: PDFDocument,
  imageSrc: string
): Promise<{ image: any; width: number; height: number }> => {
  let base64Image: string;
  
  // Convert blob URL to base64 if needed
  if (imageSrc.startsWith('blob:')) {
    base64Image = await blobURLToBase64(imageSrc);
  } else {
    base64Image = imageSrc;
  }
  
  const imageData = await loadImageAsUint8Array(base64Image);
  
  let image;
  // Determine image format from base64 header
  if (base64Image.startsWith('data:image/png')) {
    image = await pdfDoc.embedPng(imageData.data);
  } else if (base64Image.startsWith('data:image/jpeg') || base64Image.startsWith('data:image/jpg')) {
    image = await pdfDoc.embedJpg(imageData.data);
  } else {
    // Default to PNG
    image = await pdfDoc.embedPng(imageData.data);
  }
  
  const { width, height } = image.scale(1);
  
  return { image, width, height };
};

const drawCardOnPage = async (
  page: any,
  card: Card,
  x: number,
  y: number,
  width: number,
  height: number,
  pdfDoc: PDFDocument,
  showTitle: boolean = true,
  titleSize: number = 8
) => {
  try {
    if (!card.image) {
      console.warn(`Card ${card.id} has no image, skipping`);
      return;
    }
    
    const { image, width: imgWidth, height: imgHeight } = await embedImageInPDF(pdfDoc, card.image);
    
    // Reserve space for title if showing (more space for larger fonts)
    const titleSpace = showTitle ? titleSize + 8 : 0;
    const imageAreaHeight = height - titleSpace;
    
    // Calculate scaling to fit card dimensions while maintaining aspect ratio
    const scaleX = width / imgWidth;
    const scaleY = imageAreaHeight / imgHeight;
    const scale = Math.min(scaleX, scaleY);
    
    const scaledWidth = imgWidth * scale;
    const scaledHeight = imgHeight * scale;
    
    // Center the image in the card area (above title space)
    const offsetX = (width - scaledWidth) / 2;
    const offsetY = titleSpace + (imageAreaHeight - scaledHeight) / 2;
    
    // Draw image
    page.drawImage(image, {
      x: x + offsetX,
      y: y + offsetY,
      width: scaledWidth,
      height: scaledHeight,
    });

    // Draw title at bottom of card (centered, inside card area)
    if (showTitle) {
      const font = await getTitleFont(pdfDoc);
      const rawTitle = normalizeTitle(card.title || '');
      const titlePaddingX = 6;
      const maxTextWidth = Math.max(0, width - titlePaddingX * 2);

      // Si llega vacío, no dibujamos nada
      if (rawTitle) {
        // Ajustes: un poco más pequeño en general y con mínimo para legibilidad
        const preferred = Math.max(6, titleSize - 1);
        const minSize = 6;

        const fitted = fitTextToWidth(
          rawTitle,
          font,
          maxTextWidth,
          preferred,
          minSize
        );

        // Fondo del título (debajo del borde; el borde se dibuja al final)
        const titleBoxHeight = Math.max(10, fitted.size + 7);
        page.drawRectangle({
          x,
          y,
          width,
          height: titleBoxHeight,
          color: rgb(1, 1, 1),
          borderWidth: 0,
        });

        const titleY = y + 3;
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
  } catch (error) {
    console.error('Error drawing card:', error);
    // Draw error rectangle
    page.drawRectangle({
      x: x,
      y: y,
      width: width,
      height: height,
      color: rgb(0.9, 0.9, 0.9),
      borderColor: rgb(0.5, 0.5, 0.5),
      borderWidth: 1,
    });
    page.drawText('Error', {
      x: x + 5,
      y: y + height / 2,
      size: 10,
      color: rgb(0.5, 0.5, 0.5),
    });
  }
};

const drawBoardOnPage = async (
  page: any,
  board: Board,
  boardNumber: number,
  pdfDoc: PDFDocument
) => {
  // Calculate board position (centered horizontally, with top margin)
  const boardX = (PAGE_WIDTH_PT - BOARD_WIDTH_PT) / 2;
  const boardY = PAGE_HEIGHT_PT - PAGE_MARGIN_TOP_PT - BOARD_HEIGHT_PT;
  
  // Draw semi-transparent background for the board (app theme color - orange/coral)
  // This creates a subtle, diffused background that doesn't overpower the white background
  // Using very light orange/coral tint that matches the app's color scheme (#fef3e7, #fed7aa)
  page.drawRectangle({
    x: boardX - 20, // Extra padding around the board
    y: boardY - 20,
    width: BOARD_WIDTH_PT + 40,
    height: BOARD_HEIGHT_PT + 40,
    color: rgb(0.995, 0.953, 0.906), // Very light orange-tinted background (similar to #fef3e7)
    borderColor: rgb(0.98, 0.92, 0.87), // Slightly darker border (similar to #fed7aa but lighter)
    borderWidth: 1,
  });
  
  // Draw board title (centered)
  const titleText = `Tablero ${boardNumber}`;
  const titleWidth = titleText.length * 8; // Approximate width
  page.drawText(titleText, {
    x: (PAGE_WIDTH_PT - titleWidth) / 2,
    y: PAGE_HEIGHT_PT - 35,
    size: 18,
    color: rgb(0, 0, 0),
  });
  
  // Draw each card in the 4x4 grid (top to bottom, left to right)
  for (let row = 0; row < BOARD_ROWS; row++) {
    for (let col = 0; col < BOARD_COLS; col++) {
      const cardIndex = row * BOARD_COLS + col;
      const card = board.cards[cardIndex];
      
      if (card) {
        // Calculate card position
        // Start from top-left (PDF coordinates: bottom-left is origin)
        const cardX = boardX + col * (CARD_WIDTH_PT + CARD_GAP_PT);
        // Invert row: row 0 is at top, so we use (BOARD_ROWS - 1 - row)
        const cardY = boardY + (BOARD_ROWS - 1 - row) * (CARD_HEIGHT_PT + CARD_GAP_PT);
        
        await drawCardOnPage(
          page,
          card,
          cardX,
          cardY,
          CARD_WIDTH_PT,
          CARD_HEIGHT_PT,
          pdfDoc,
          true, // showTitle
          11 // titleSize (larger, more traditional loteria style)
        );
      }
    }
  }
};

export const generatePDF = async (boards: Board[]): Promise<Blob> => {
  const pdfDoc = await PDFDocument.create();
  
  // Add a page for each board
  for (let i = 0; i < boards.length; i++) {
    const board = boards[i];
    const page = pdfDoc.addPage([PAGE_WIDTH_PT, PAGE_HEIGHT_PT]);
    
    await drawBoardOnPage(page, board, i + 1, pdfDoc);
  }
  
  // Optionally add pages with all cards (full deck)
  const allCards = await loadCards();
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

    // Traditional lotería aspect ratio
    const DECK_ASPECT = 7 / 11; // width / height

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
          12
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

