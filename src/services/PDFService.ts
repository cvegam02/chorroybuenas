import {
  PDFDocument,
  rgb,
  StandardFonts,
  type PDFFont,
  pushGraphicsState,
  popGraphicsState,
  rectangle,
  clip,
  endPath,
} from 'pdf-lib';
import { Board, Card } from '../types';
import { loadCards } from '../utils/storage';
import { blobToBase64 } from '../utils/indexedDB';
import logoImage from '../img/logo.png';

// Convert cm to points (1 cm = 28.35 points)
const cmToPoints = (cm: number) => cm * 28.35;

// Page dimensions (A4: 210mm x 297mm = 21cm x 29.7cm)
const PAGE_WIDTH_PT = cmToPoints(21);  // 595.35pt
const PAGE_HEIGHT_PT = cmToPoints(29.7); // 842.0pt

// Traditional lotería board dimensions (mediano) - VERTICAL orientation
const BOARD_WIDTH_CM = 14; // Traditional mediano board width (vertical)
const BOARD_HEIGHT_CM = 21; // Traditional mediano board height (vertical)
const BOARD_WIDTH_PT = cmToPoints(BOARD_WIDTH_CM);
const BOARD_HEIGHT_PT = cmToPoints(BOARD_HEIGHT_CM);

// Board has 4x4 cards
const BOARD_COLS = 4;
const BOARD_ROWS = 4;

// Gap between cards (small gap for traditional look)
const CARD_GAP_PT = cmToPoints(0.15); // ~4.25pt (small gap between cards)

// Calculate card dimensions to fit exactly in traditional board size
// Total gap space = (BOARD_COLS - 1) * CARD_GAP_PT
const TOTAL_GAP_WIDTH = (BOARD_COLS - 1) * CARD_GAP_PT;
const TOTAL_GAP_HEIGHT = (BOARD_ROWS - 1) * CARD_GAP_PT;
const CARD_WIDTH_PT = (BOARD_WIDTH_PT - TOTAL_GAP_WIDTH) / BOARD_COLS;
const CARD_HEIGHT_PT = (BOARD_HEIGHT_PT - TOTAL_GAP_HEIGHT) / BOARD_ROWS;

// Cut area dimensions - contains logo, title, and board
// Header maximum height: 3 cm (85.05 points)
const MAX_HEADER_CM = 3;
const MAX_HEADER_PT = cmToPoints(MAX_HEADER_CM);
const HEADER_GAP_PT = 3; // Gap between title and board (minimal)
const TITLE_HEIGHT_PT = 10; // Space reserved for title text
const LOGO_HEIGHT_PT = MAX_HEADER_PT - HEADER_GAP_PT - TITLE_HEIGHT_PT; // Logo height to fit in max header (72pt ~2.54cm)
const HEADER_TOTAL_PT = MAX_HEADER_PT; // Total header space (maximum 3 cm)
const CUT_AREA_WIDTH_PT = BOARD_WIDTH_PT; // Same width as board
const CUT_AREA_HEIGHT_PT = BOARD_HEIGHT_PT + HEADER_TOTAL_PT; // Board + header

// Calculate cut area position (centered both vertically and horizontally)
const CUT_AREA_X_PT = (PAGE_WIDTH_PT - CUT_AREA_WIDTH_PT) / 2; // Centered horizontally
const CUT_AREA_Y_PT = (PAGE_HEIGHT_PT - CUT_AREA_HEIGHT_PT) / 2; // Centered vertically

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
    try {
      base64Image = await blobURLToBase64(imageSrc);
    } catch (error) {
      console.error('Error converting blob URL to base64:', error);
      throw new Error(`No se pudo convertir el blob URL a base64: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  } else {
    base64Image = imageSrc;
  }
  
  // Remove data URL prefix if present
  const base64Data = base64Image.includes(',') 
    ? base64Image.split(',')[1] 
    : base64Image;
  
  if (!base64Data || base64Data.length === 0) {
    throw new Error('El base64 de la imagen está vacío');
  }
  
  let binaryString: string;
  try {
    binaryString = atob(base64Data);
  } catch (error) {
    console.error('Error decoding base64:', error);
    throw new Error(`Error al decodificar base64: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
  
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  // Create image to get dimensions
  const img = new Image();
  img.src = base64Image;
  await new Promise((resolve, reject) => {
    img.onload = () => {
      if (img.width === 0 || img.height === 0) {
        reject(new Error('La imagen tiene dimensiones inválidas (0x0)'));
      } else {
        resolve(undefined);
      }
    };
    img.onerror = (error) => {
      console.error('Error loading image:', error);
      reject(new Error('No se pudo cargar la imagen para obtener sus dimensiones'));
    };
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
  try {
    let base64Image: string;
    
    // Convert blob URL to base64 if needed
    if (imageSrc.startsWith('blob:')) {
      console.log(`Converting blob URL to base64: ${imageSrc.substring(0, 50)}...`);
      base64Image = await blobURLToBase64(imageSrc);
      console.log(`Blob URL converted successfully, base64 prefix: ${base64Image.substring(0, 50)}...`);
    } else {
      base64Image = imageSrc;
      console.log(`Using base64 directly, prefix: ${base64Image.substring(0, 50)}...`);
    }
    
    console.log(`Loading image as Uint8Array...`);
    const imageData = await loadImageAsUint8Array(base64Image);
    console.log(`Image loaded: ${imageData.data.length} bytes, dimensions: ${imageData.width}x${imageData.height}`);
    
    let image;
    // Determine image format from base64 header
    if (base64Image.startsWith('data:image/png')) {
      console.log(`Embedding as PNG...`);
      image = await pdfDoc.embedPng(imageData.data);
      console.log(`PNG embedded successfully`);
    } else if (base64Image.startsWith('data:image/jpeg') || base64Image.startsWith('data:image/jpg')) {
      console.log(`Embedding as JPEG...`);
      image = await pdfDoc.embedJpg(imageData.data);
      console.log(`JPEG embedded successfully`);
    } else {
      // Default to PNG
      console.log(`Unknown format, defaulting to PNG...`);
      try {
        image = await pdfDoc.embedPng(imageData.data);
        console.log(`PNG (default) embedded successfully`);
      } catch (pngError) {
        console.log(`PNG failed, trying JPEG as fallback...`);
        image = await pdfDoc.embedJpg(imageData.data);
        console.log(`JPEG (fallback) embedded successfully`);
      }
    }
    
    const { width, height } = image.scale(1);
    console.log(`Image ready: ${width}x${height}`);
    
    return { image, width, height };
  } catch (error) {
    console.error('Error in embedImageInPDF:', error);
    console.error('Image source:', imageSrc.substring(0, 100));
    throw error;
  }
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
    
    console.log(`Drawing card ${card.id} - Image type: ${card.image.substring(0, 50)}...`);
    const { image, width: imgWidth, height: imgHeight } = await embedImageInPDF(pdfDoc, card.image);
    console.log(`Successfully embedded image for card ${card.id} - Dimensions: ${imgWidth}x${imgHeight}`);
    
    // Reserve space for title if showing (more space for larger fonts)
    const titleSpace = showTitle ? titleSize + 8 : 0;
    const imageAreaHeight = height - titleSpace;
    
    // Scale to cover the card area while maintaining aspect ratio
    // This avoids empty margins by allowing cropping.
    const scaleX = width / imgWidth;
    const scaleY = imageAreaHeight / imgHeight;
    const scale = Math.max(scaleX, scaleY);
    
    const scaledWidth = imgWidth * scale;
    const scaledHeight = imgHeight * scale;
    
    // Center the image in the card area (above title space)
    const offsetX = (width - scaledWidth) / 2;
    const offsetY = titleSpace + (imageAreaHeight - scaledHeight) / 2;
    
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
    console.error(`Error drawing card ${card.id}:`, error);
    console.error(`Card title: ${card.title}`);
    console.error(`Card image: ${card.image ? card.image.substring(0, 100) : 'null'}...`);
    if (error instanceof Error) {
      console.error(`Error message: ${error.message}`);
      console.error(`Error stack: ${error.stack}`);
    }
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

// Cache for logo image to avoid loading it multiple times
let logoImageCache: { image: any; width: number; height: number } | null = null;

const getLogoImage = async (pdfDoc: PDFDocument): Promise<{ image: any; width: number; height: number }> => {
  if (logoImageCache) {
    return logoImageCache;
  }

  try {
    // Fetch the logo image
    const response = await fetch(logoImage);
    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Embed PNG logo in PDF
    const image = await pdfDoc.embedPng(uint8Array);
    const { width, height } = image.scale(1);
    
    logoImageCache = { image, width, height };
    return logoImageCache;
  } catch (error) {
    console.error('Error loading logo image:', error);
    throw error;
  }
};

const drawBoardOnPage = async (
  page: any,
  board: Board,
  boardNumber: number,
  pdfDoc: PDFDocument
) => {
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
    x: boardX - 20, // Extra padding around the cut area
    y: boardY - 20,
    width: CUT_AREA_WIDTH_PT + 40,
    height: CUT_AREA_HEIGHT_PT + 40,
    color: rgb(0.995, 0.953, 0.906), // Very light orange-tinted background (similar to #fef3e7)
    borderColor: rgb(0.98, 0.92, 0.87), // Slightly darker border (similar to #fed7aa but lighter)
    borderWidth: 1,
  });
  
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
    console.warn('Could not draw logo on board:', error);
    // Continue without logo if there's an error
  }
  
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
  
  // Refresh images for board cards from IndexedDB - get Blob directly and convert to base64
  // This avoids using blob URLs that may have been revoked
  const { getImageBlob } = await import('../utils/indexedDB');
  
  console.log(`Refreshing images for ${boards.length} boards...`);
  
  // Refresh images for all cards in boards - convert Blobs directly to base64
  const refreshedBoards: Board[] = await Promise.all(
    boards.map(async (board, boardIndex) => {
      console.log(`Refreshing images for board ${boardIndex + 1} with ${board.cards.length} cards...`);
      const refreshedCards = await Promise.all(
        board.cards.map(async (card, cardIndex) => {
          if (card.id) {
            try {
              console.log(`  Getting image blob for card ${card.id} (board ${boardIndex + 1}, card ${cardIndex + 1})...`);
              // Get the Blob directly from IndexedDB and convert to base64
              const imageBlob = await getImageBlob(card.id);
              if (imageBlob) {
                const base64Image = await blobToBase64(imageBlob);
                console.log(`  ✓ Got image blob and converted to base64 for card ${card.id}`);
                return {
                  ...card,
                  image: base64Image, // Use base64 directly instead of blob URL
                };
              } else {
                console.warn(`  ⚠ No image blob found in IndexedDB for card ${card.id}`);
              }
            } catch (error) {
              console.error(`  ❌ Error getting image blob for card ${card.id}:`, error);
            }
          } else {
            console.warn(`  ⚠ Card at position ${cardIndex} in board ${boardIndex + 1} has no ID`);
          }
          // If refresh failed, return card as-is (will try to use original, but may fail)
          if (!card.image) {
            console.error(`  ❌ Card ${card.id || 'unknown'} has no image at all!`);
          }
          return card;
        })
      );
      
      console.log(`✓ Finished refreshing board ${boardIndex + 1}`);
      return {
        ...board,
        cards: refreshedCards,
      };
    })
  );
  
  console.log(`✓ Finished refreshing all boards`);
  
  // Add a page for each board
  for (let i = 0; i < refreshedBoards.length; i++) {
    const board = refreshedBoards[i];
    const page = pdfDoc.addPage([PAGE_WIDTH_PT, PAGE_HEIGHT_PT]);
    
    await drawBoardOnPage(page, board, i + 1, pdfDoc);
  }
  
  // Optionally add pages with all cards (full deck)
  // Refresh images from IndexedDB to ensure they have the same aspect ratio as board cards
  let allCards = await loadCards();
  if (allCards.length > 0) {
    console.log(`Refreshing images for all cards (${allCards.length} cards) from IndexedDB...`);
    
    // Refresh images for all cards - convert Blobs directly to base64
    // This ensures they have the same aspect ratio (5:7.5) as the cards in boards
    allCards = await Promise.all(
      allCards.map(async (card) => {
        if (card.id) {
          try {
            // Get the Blob directly from IndexedDB and convert to base64
            const imageBlob = await getImageBlob(card.id);
            if (imageBlob) {
              const base64Image = await blobToBase64(imageBlob);
              console.log(`  ✓ Refreshed image for card ${card.id} (${card.title})`);
              return {
                ...card,
                image: base64Image, // Use base64 directly instead of blob URL
              };
            } else {
              console.warn(`  ⚠ No image blob found in IndexedDB for card ${card.id} (${card.title})`);
            }
          } catch (error) {
            console.error(`  ❌ Error getting image blob for card ${card.id} (${card.title}):`, error);
          }
        }
        return card; // Return original card if no ID or refresh failed
      })
    );
    
    console.log(`✓ Finished refreshing images for all cards`);
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
          11 // titleSize (same as boards for consistency)
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

