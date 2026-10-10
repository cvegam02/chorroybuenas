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

// Letra más chica con la que se escribe el nombre de una carta, medida en la carta de un tablero de 4 × 4;
// lo que no quepa en un renglón a este tamaño pasa a dos renglones
export const MIN_TITLE_SIZE_PT = 8;

// Gap between cards (small gap for traditional look)
export const CARD_GAP_PT = cmToPoints(0.15); // ~4.25pt (small gap between cards)

// Removed hardcoded card dimensions (CARD_WIDTH_PT, CARD_HEIGHT_PT) - these are now calculated dynamically per board

// Borde negro de cada carta: va centrado sobre su orilla, así que sobresale la mitad
export const CARD_BORDER_PT = 2;

// Cut area dimensions - contains logo, title, and board
// Encabezado del tablero: logo centrado arriba y, debajo, «TABLERO N» entre dos líneas.
// Su alto es lo más que cabe sin que las marcas de corte se salgan de lo que la impresora alcanza
export const HEADER_TOTAL_PT = cmToPoints(3.19);
export const BOARD_TITLE_SIZE_PT = 16;
// Alto de las mayúsculas de Arvo Bold: 0.74 del tamaño de la letra
export const BOARD_TITLE_CAP_HEIGHT_PT = BOARD_TITLE_SIZE_PT * 0.74;
// Del pie del título a la cuadrícula de cartas
export const BOARD_TITLE_GAP_PT = cmToPoints(0.4);
// De cada línea del título al texto
export const BOARD_TITLE_LINE_GAP_PT = cmToPoints(0.4);
export const BOARD_TITLE_LINE_THICKNESS_PT = 1.25;
// Del logo al título
export const BOARD_LOGO_GAP_PT = cmToPoints(0.1);
// Alto de la parte visible del logo: lo que queda del encabezado
export const BOARD_LOGO_HEIGHT_PT = HEADER_TOTAL_PT - BOARD_TITLE_GAP_PT - BOARD_TITLE_CAP_HEIGHT_PT - BOARD_LOGO_GAP_PT;
// Parte de `logo.png` que no es transparente, como fracción de la imagen y medida desde su esquina superior izquierda
export const LOGO_VISIBLE_BOX = { left: 77 / 500, right: 426 / 500, top: 89 / 500, bottom: 398 / 500 };
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
