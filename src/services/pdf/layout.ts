import {
  CUT_AREA_BLEED_PT,
  CUT_AREA_HEIGHT_PT,
  CUT_AREA_WIDTH_PT,
  CUT_AREA_X_PT,
  CUT_AREA_Y_PT,
  CUT_LINE_MARGIN_PT,
  CUT_MARK_GAP_PT,
  CUT_MARK_LENGTH_PT,
  PAGE_HEIGHT_PT,
  PAGE_WIDTH_PT,
  cmToPoints,
} from './constants';

/** Cómo se acomoda la imagen en su casilla: llenándola (se recorta lo que sobra) o entera (sin recortar). */
export type CardImageFit = 'cover' | 'contain';

export interface CardImagePlacement {
  /** Posición respecto a la esquina inferior izquierda de la casilla. */
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
}

/** Tamaño y posición de la imagen dentro de la casilla, centrada sobre el espacio reservado al título. */
export function placeImageInCard(
  imgWidth: number,
  imgHeight: number,
  cardWidth: number,
  cardHeight: number,
  titleSpace: number,
  fit: CardImageFit,
): CardImagePlacement {
  const imageAreaHeight = cardHeight - titleSpace;
  const scaleX = cardWidth / imgWidth;
  const scaleY = imageAreaHeight / imgHeight;
  const scale = fit === 'cover' ? Math.max(scaleX, scaleY) : Math.min(scaleX, scaleY);

  const width = imgWidth * scale;
  const height = imgHeight * scale;
  return {
    offsetX: (cardWidth - width) / 2,
    offsetY: titleSpace + (imageAreaHeight - height) / 2,
    width,
    height,
  };
}

/** Alto de la letra mayúscula de Helvetica Bold, como fracción del tamaño de letra. */
const TITLE_CAP_HEIGHT_RATIO = 0.718;

/** Alto de la franja del nombre, al pie de la carta. La foto termina justo donde empieza. */
export function titleSpaceFor(titleSize: number): number {
  return titleSize + 8;
}

/** Distancia del pie de la carta a la base del texto, para que el nombre quede centrado en su franja. */
export function titleBaselineOffset(titleSpace: number, fontSize: number): number {
  return (titleSpace - fontSize * TITLE_CAP_HEIGHT_RATIO) / 2;
}

// Baraja completa: hoja acostada, para desperdiciar menos papel dejando espacio de corte entre cartas.
const DECK_GAP_PT = cmToPoints(0.4);
const DECK_MARGIN_X_PT = 30;
const DECK_MARGIN_TOP_PT = 26;
const DECK_MARGIN_BOTTOM_PT = 26;
const DECK_HEADER_HEIGHT_PT = 26;
const DECK_TITLE_DROP_PT = 18;
const DECK_COLS = 5;
const DECK_ROWS = 2;
/** Proporción ancho / alto de la carta (5 × 7.5), la misma que en los tableros. */
const DECK_CARD_ASPECT = 5 / 7.5;

export interface DeckGridLayout {
  pageWidth: number;
  pageHeight: number;
  cols: number;
  rows: number;
  cardWidth: number;
  cardHeight: number;
  /** Espacio entre cartas, a lo ancho y a lo alto. */
  gap: number;
  /** Orilla izquierda de la primera columna. */
  startX: number;
  /** Orilla superior de la primera fila. */
  topY: number;
  /** Límites, arriba y abajo, del espacio donde se acomoda la cuadrícula: bajo el título y sobre el margen. */
  areaTop: number;
  areaBottom: number;
  /** Base del título de la página. */
  titleY: number;
}

/** Medidas de una página de la baraja: la cuadrícula más grande que cabe, centrada a lo ancho y a lo alto. */
export function deckGridLayout(): DeckGridLayout {
  const pageWidth = PAGE_HEIGHT_PT;
  const pageHeight = PAGE_WIDTH_PT;

  const availableWidth = pageWidth - DECK_MARGIN_X_PT * 2 - (DECK_COLS - 1) * DECK_GAP_PT;
  const availableHeight =
    pageHeight - DECK_MARGIN_TOP_PT - DECK_HEADER_HEIGHT_PT - DECK_MARGIN_BOTTOM_PT - (DECK_ROWS - 1) * DECK_GAP_PT;

  // Manda el lado que se acabe primero: el ancho de la hoja o su alto.
  const cardWidth = Math.min(availableWidth / DECK_COLS, (availableHeight / DECK_ROWS) * DECK_CARD_ASPECT);
  const cardHeight = cardWidth / DECK_CARD_ASPECT;
  const gridWidth = DECK_COLS * cardWidth + (DECK_COLS - 1) * DECK_GAP_PT;
  const gridHeight = DECK_ROWS * cardHeight + (DECK_ROWS - 1) * DECK_GAP_PT;
  const areaTop = pageHeight - DECK_MARGIN_TOP_PT - DECK_HEADER_HEIGHT_PT;
  const areaBottom = DECK_MARGIN_BOTTOM_PT;

  return {
    pageWidth,
    pageHeight,
    cols: DECK_COLS,
    rows: DECK_ROWS,
    cardWidth,
    cardHeight,
    gap: DECK_GAP_PT,
    startX: (pageWidth - gridWidth) / 2,
    topY: areaTop - (areaTop - areaBottom - gridHeight) / 2,
    areaTop,
    areaBottom,
    titleY: pageHeight - DECK_TITLE_DROP_PT,
  };
}

export interface Point {
  x: number;
  y: number;
}

export interface CutMark {
  start: Point;
  end: Point;
}

export interface CutGuides {
  /** Línea punteada por donde se recorta: rodea el tablero y su encabezado. */
  line: { x: number; y: number; width: number; height: number };
  /** Marcas de las esquinas: dos por esquina, fuera del fondo crema y alineadas con la línea. */
  marks: CutMark[];
}

/** Guías de corte de una página de tablero. */
export function cutGuides(): CutGuides {
  const left = CUT_AREA_X_PT - CUT_LINE_MARGIN_PT;
  const right = CUT_AREA_X_PT + CUT_AREA_WIDTH_PT + CUT_LINE_MARGIN_PT;
  const bottom = CUT_AREA_Y_PT - CUT_LINE_MARGIN_PT;
  const top = CUT_AREA_Y_PT + CUT_AREA_HEIGHT_PT + CUT_LINE_MARGIN_PT;

  // Distancia de la línea a donde empieza y termina cada marca, ya pasado el fondo crema.
  const near = CUT_AREA_BLEED_PT - CUT_LINE_MARGIN_PT + CUT_MARK_GAP_PT;
  const far = near + CUT_MARK_LENGTH_PT;

  const marks = [left, right].flatMap((x) =>
    [bottom, top].flatMap((y) => {
      const outX = x === left ? -1 : 1;
      const outY = y === bottom ? -1 : 1;
      return [
        { start: { x, y: y + outY * near }, end: { x, y: y + outY * far } },
        { start: { x: x + outX * near, y }, end: { x: x + outX * far, y } },
      ];
    }),
  );

  return { line: { x: left, y: bottom, width: right - left, height: top - bottom }, marks };
}
