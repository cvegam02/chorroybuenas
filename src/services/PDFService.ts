import { PDFDocument, rgb } from 'pdf-lib';
import { Board, Card } from '../types';
import { loadCards } from '../utils/storage';

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

const loadImageAsUint8Array = async (base64Image: string): Promise<ImageData> => {
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
  base64Image: string
): Promise<{ image: any; width: number; height: number }> => {
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
    const { image, width: imgWidth, height: imgHeight } = await embedImageInPDF(pdfDoc, card.image);
    
    // Reserve space for title if showing
    const titleSpace = showTitle ? titleSize + 4 : 0;
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
    
    // Draw card border
    page.drawRectangle({
      x: x,
      y: y,
      width: width,
      height: height,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1,
    });
    
    // Draw title at bottom of card (inside card area)
    if (showTitle) {
      const titleY = y + 2; // Small margin from bottom
      page.drawText(card.title, {
        x: x + 2,
        y: titleY,
        size: titleSize,
        color: rgb(0, 0, 0),
        maxWidth: width - 4,
      });
    }
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
          7 // titleSize (smaller to fit better)
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
  const allCards = loadCards();
  if (allCards.length > 0) {
    // Use smaller cards for the full deck to fit more per page
    const DECK_CARD_GAP = cmToPoints(0.3); // ~8.5pt
    const DECK_MARGIN = 30; // margin on sides
    
    // Calculate how many cards per row
    const availableWidth = PAGE_WIDTH_PT - (DECK_MARGIN * 2);
    const cardsPerRow = Math.floor((availableWidth + DECK_CARD_GAP) / (CARD_WIDTH_PT + DECK_CARD_GAP));
    const cardSpacing = cardsPerRow > 1 
      ? (availableWidth - cardsPerRow * CARD_WIDTH_PT) / (cardsPerRow - 1)
      : 0;
    
    let cardsPage = pdfDoc.addPage([PAGE_WIDTH_PT, PAGE_HEIGHT_PT]);
    let pageNumber = 1;
    
    // Draw title on first cards page
    const titleText = pageNumber === 1 ? 'Baraja Completa' : `Baraja Completa (continuación - Página ${pageNumber})`;
    const titleWidth = titleText.length * 8;
    cardsPage.drawText(titleText, {
      x: (PAGE_WIDTH_PT - titleWidth) / 2,
      y: PAGE_HEIGHT_PT - 30,
      size: 16,
      color: rgb(0, 0, 0),
    });
    
    let currentRow = 0;
    let currentCol = 0;
    const rowHeight = CARD_HEIGHT_PT + 15; // Space between rows
    let yPosition = PAGE_HEIGHT_PT - 60; // Start below title
    
    for (const card of allCards) {
      // Check if we need a new row
      if (currentCol >= cardsPerRow) {
        currentCol = 0;
        currentRow++;
        yPosition -= rowHeight;
        
        // Check if we need a new page
        if (yPosition < (PAGE_MARGIN_BOTTOM_PT + CARD_HEIGHT_PT)) {
          pageNumber++;
          cardsPage = pdfDoc.addPage([PAGE_WIDTH_PT, PAGE_HEIGHT_PT]);
          const newTitleText = `Baraja Completa (continuación - Página ${pageNumber})`;
          const newTitleWidth = newTitleText.length * 8;
          cardsPage.drawText(newTitleText, {
            x: (PAGE_WIDTH_PT - newTitleWidth) / 2,
            y: PAGE_HEIGHT_PT - 30,
            size: 16,
            color: rgb(0, 0, 0),
          });
          yPosition = PAGE_HEIGHT_PT - 60; // Reset Y position after title
          currentRow = 0;
        }
      }
      
      // Calculate card position
      const cardX = DECK_MARGIN + currentCol * (CARD_WIDTH_PT + cardSpacing);
      const cardY = yPosition - CARD_HEIGHT_PT;
      
      await drawCardOnPage(
        cardsPage,
        card,
        cardX,
        cardY,
        CARD_WIDTH_PT,
        CARD_HEIGHT_PT,
        pdfDoc,
        true, // showTitle
        6 // Smaller title size for deck
      );
      
      currentCol++;
    }
  }
  
  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
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
  
  // Use original card aspect ratio (5cm x 7.5cm = 2:3)
  const cardAspectRatio = 2 / 3;
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
  return new Blob([pdfBytes], { type: 'application/pdf' });
};

