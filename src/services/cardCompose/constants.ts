import { BOARD_WIDTH_PT, CARD_GAP_PT, MIN_TITLE_SIZE_PT } from '../pdf/constants';

// Colores y letra de la carta impresa (FEAT-29, decisiones 1 y 9). Son del producto, no del sitio:
// no forman parte de la paleta ni de la tipografía del sistema de diseño.
export const CARD_MARGIN_COLOR = '#F4EAD4';
export const CARD_INK_COLOR = '#14100A';
export const CARD_NAME_COLOR = '#FFFFFF';
/** Nombre propio para la familia, para que el navegador use el archivo del proyecto y no una Arvo instalada. */
export const CARD_FONT_FAMILY = 'ArvoCarta';
export const CARD_FONT_WEIGHT = '700';

/** Ancho de la carta compuesta: el de las fotos guardadas, más de 300 dpi en la carta de la baraja. */
export const COMPOSED_CARD_WIDTH_PX = 768;
/** Alto de la carta por cada unidad de ancho: 2:3 vertical. */
export const CARD_HEIGHT_RATIO = 3 / 2;

// Medidas como fracción del ancho de la carta; salen de la carta de referencia de 1000 × 1500.
export const CARD_MARGIN_RATIO = 0.04;
export const CARD_FRAME_RATIO = 0.005;
export const CARD_TEXT_PADDING_RATIO = 0.035;
export const CARD_NAME_SIZE_RATIO = 0.12;
export const CARD_NUMBER_SIZE_RATIO = 0.11;

/** Carta más chica que se imprime: la de un tablero de 4 × 4. Ahí se mide la letra mínima del nombre. */
const SMALLEST_PRINTED_CARD_WIDTH_PT = (BOARD_WIDTH_PT - 3 * CARD_GAP_PT) / 4;
export const CARD_NAME_MIN_SIZE_RATIO = MIN_TITLE_SIZE_PT / SMALLEST_PRINTED_CARD_WIDTH_PT;

/** Distancia entre los dos renglones de un nombre largo, como fracción del tamaño de la letra. */
export const CARD_NAME_LINE_HEIGHT_RATIO = 1.15;

// Contorno y sombra del texto, como fracción del tamaño de la letra.
export const TEXT_OUTLINE_RATIO = 0.08;
export const TEXT_SHADOW_BLUR_RATIO = 0.12;
export const TEXT_SHADOW_OFFSET_RATIO = 0.05;
export const TEXT_SHADOW_COLOR = 'rgba(0, 0, 0, 0.6)';
