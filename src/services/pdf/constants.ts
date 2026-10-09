// Convert cm to points (1 cm = 28.35 points)
export const cmToPoints = (cm: number) => cm * 28.35;

// Page dimensions: hoja carta (8.5 × 11 pulgadas = 21.59 × 27.94 cm), a 72 puntos por pulgada
export const PAGE_WIDTH_PT = 612;
export const PAGE_HEIGHT_PT = 792;

// Traditional lotería board dimensions (mediano) - VERTICAL orientation
export const BOARD_WIDTH_CM = 14; // Traditional mediano board width (vertical)
export const BOARD_HEIGHT_CM = 21; // Traditional mediano board height (vertical)
export const BOARD_WIDTH_PT = cmToPoints(BOARD_WIDTH_CM);
export const BOARD_HEIGHT_PT = cmToPoints(BOARD_HEIGHT_CM);

// Board has 4x4 cards
// Removed hardcoded constants: BOARD_COLS, BOARD_ROWS

// Letra más chica con la que se escribe el nombre de una carta; lo que no quepa a este tamaño se corta con «…»
export const MIN_TITLE_SIZE_PT = 8;

// Gap between cards (small gap for traditional look)
export const CARD_GAP_PT = cmToPoints(0.15); // ~4.25pt (small gap between cards)

// Removed hardcoded card dimensions (CARD_WIDTH_PT, CARD_HEIGHT_PT) - these are now calculated dynamically per board

// Cut area dimensions - contains logo, title, and board
// Header maximum height: 3 cm (85.05 points)
export const MAX_HEADER_CM = 3;
export const MAX_HEADER_PT = cmToPoints(MAX_HEADER_CM);
export const HEADER_GAP_PT = 3; // Gap between title and board (minimal)
export const TITLE_HEIGHT_PT = 10; // Space reserved for title text
export const LOGO_HEIGHT_PT = MAX_HEADER_PT - HEADER_GAP_PT - TITLE_HEIGHT_PT; // Logo height to fit in max header (72pt ~2.54cm)
export const HEADER_TOTAL_PT = MAX_HEADER_PT; // Total header space (maximum 3 cm)
export const CUT_AREA_WIDTH_PT = BOARD_WIDTH_PT; // Same width as board
export const CUT_AREA_HEIGHT_PT = BOARD_HEIGHT_PT + HEADER_TOTAL_PT; // Board + header
// Cuánto sobresale el fondo crema del tablero y su encabezado, por cada lado
export const CUT_AREA_BLEED_PT = 20;
// La línea de corte pasa separada del tablero y su encabezado, para que no caiga sobre el borde negro de las cartas
export const CUT_LINE_MARGIN_PT = cmToPoints(0.3);
// Marcas de corte de las esquinas: empiezan un poco después del fondo crema
export const CUT_MARK_GAP_PT = 3;
export const CUT_MARK_LENGTH_PT = 12;
// Franja de la orilla de la hoja que una impresora casera no alcanza a imprimir (un cuarto de pulgada)
export const PRINT_SAFE_MARGIN_PT = 18;

// Calculate cut area position (centered both vertically and horizontally)
export const CUT_AREA_X_PT = (PAGE_WIDTH_PT - CUT_AREA_WIDTH_PT) / 2; // Centered horizontally
export const CUT_AREA_Y_PT = (PAGE_HEIGHT_PT - CUT_AREA_HEIGHT_PT) / 2; // Centered vertically

// Baraja completa: hoja acostada, para desperdiciar menos papel dejando espacio de corte entre cartas
export const DECK_COLS = 5;
export const DECK_ROWS = 2;
// Proporción ancho / alto de la carta (5 × 7.5), la misma que en los tableros
export const DECK_CARD_ASPECT = 5 / 7.5;
export const DECK_GAP_PT = cmToPoints(0.4);
export const DECK_MARGIN_X_PT = 30;
export const DECK_MARGIN_TOP_PT = 26;
export const DECK_MARGIN_BOTTOM_PT = 26;
export const DECK_HEADER_HEIGHT_PT = 26;
// Distancia de la orilla superior de la hoja a la base del título de la página
export const DECK_TITLE_DROP_PT = 18;
export const DECK_TITLE_SIZE_PT = 12;
// Letra del nombre de cada carta de la baraja
export const DECK_CARD_TITLE_SIZE_PT = 11;
