// Convert cm to points (1 cm = 28.35 points)
export const cmToPoints = (cm: number) => cm * 28.35;

// Page dimensions (A4: 210mm x 297mm = 21cm x 29.7cm)
export const PAGE_WIDTH_PT = cmToPoints(21);  // 595.35pt
export const PAGE_HEIGHT_PT = cmToPoints(29.7); // 842.0pt

// Traditional lotería board dimensions (mediano) - VERTICAL orientation
export const BOARD_WIDTH_CM = 14; // Traditional mediano board width (vertical)
export const BOARD_HEIGHT_CM = 21; // Traditional mediano board height (vertical)
export const BOARD_WIDTH_PT = cmToPoints(BOARD_WIDTH_CM);
export const BOARD_HEIGHT_PT = cmToPoints(BOARD_HEIGHT_CM);

// Board has 4x4 cards
// Removed hardcoded constants: BOARD_COLS, BOARD_ROWS

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

// Calculate cut area position (centered both vertically and horizontally)
export const CUT_AREA_X_PT = (PAGE_WIDTH_PT - CUT_AREA_WIDTH_PT) / 2; // Centered horizontally
export const CUT_AREA_Y_PT = (PAGE_HEIGHT_PT - CUT_AREA_HEIGHT_PT) / 2; // Centered vertically
