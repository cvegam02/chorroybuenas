import {
  CUT_AREA_BLEED_PT,
  CUT_AREA_HEIGHT_PT,
  CUT_AREA_WIDTH_PT,
  CUT_AREA_X_PT,
  CUT_AREA_Y_PT,
  CUT_LINE_MARGIN_PT,
  CUT_MARK_GAP_PT,
  CUT_MARK_LENGTH_PT,
  DECK_CARD_ASPECT,
  DECK_COLS,
  DECK_GAP_PT,
  DECK_HEADER_HEIGHT_PT,
  DECK_MARGIN_BOTTOM_PT,
  DECK_MARGIN_TOP_PT,
  DECK_MARGIN_X_PT,
  DECK_ROWS,
  DECK_TITLE_DROP_PT,
  PAGE_HEIGHT_PT,
  PAGE_WIDTH_PT,
  PRINT_SAFE_MARGIN_PT,
} from './constants';

/** Cómo se acomoda la imagen en su casilla: llenándola (se recorta lo que sobra) o entera (sin recortar). */
export type CardImageFit = 'cover' | 'contain';

export interface CardImagePlacement {
  /** Posición respecto a una esquina de la casilla. */
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
}

/** Tamaño y posición de la imagen dentro de la casilla, centrada. */
export function placeImageInCard(
  imgWidth: number,
  imgHeight: number,
  cardWidth: number,
  cardHeight: number,
  fit: CardImageFit,
): CardImagePlacement {
  const scaleX = cardWidth / imgWidth;
  const scaleY = cardHeight / imgHeight;
  const scale = fit === 'cover' ? Math.max(scaleX, scaleY) : Math.min(scaleX, scaleY);

  const width = imgWidth * scale;
  const height = imgHeight * scale;
  return {
    offsetX: (cardWidth - width) / 2,
    offsetY: (cardHeight - height) / 2,
    width,
    height,
  };
}

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
  /** Dónde empieza el título de la página: orilla izquierda y base del texto. */
  titleX: number;
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
    titleX: DECK_MARGIN_X_PT,
    titleY: pageHeight - DECK_TITLE_DROP_PT,
  };
}

/** Reparte la baraja en páginas: todas llenas, y lo que sobre en la última. */
export function deckPages<T>(cards: T[], deck: DeckGridLayout): T[][] {
  const perPage = deck.cols * deck.rows;
  return Array.from({ length: Math.ceil(cards.length / perPage) }, (_, page) =>
    cards.slice(page * perPage, (page + 1) * perPage),
  );
}

/** Título de una página de la baraja; de la segunda en adelante avisa que es continuación. */
export function deckPageTitle(pageNumber: number): string {
  return pageNumber === 1 ? 'Baraja Completa' : `Baraja Completa (continuación - Página ${pageNumber})`;
}

export interface Point {
  x: number;
  y: number;
}

/** Esquina inferior izquierda de la carta número `index` de una página: se llenan por filas, desde arriba. */
export function deckCardPosition(deck: DeckGridLayout, index: number): Point {
  const row = Math.floor(index / deck.cols);
  const col = index % deck.cols;
  return {
    x: deck.startX + col * (deck.cardWidth + deck.gap),
    y: deck.topY - deck.cardHeight - row * (deck.cardHeight + deck.gap),
  };
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

export interface DeckCutGuides {
  /** Líneas punteadas de corte: por en medio de cada espacio entre cartas y alrededor del grupo. */
  lines: CutMark[];
  /** Una marca corta en cada extremo de cada línea, ya fuera del grupo. */
  marks: CutMark[];
}

/**
 * Guías de corte de una página de la baraja con `cardCount` cartas. Entre cartas no cabe una línea
 * por carta, así que cada línea pasa a media distancia de las dos vecinas: un corte separa dos cartas.
 */
export function deckCutGuides(deck: DeckGridLayout, cardCount: number): DeckCutGuides {
  if (cardCount <= 0) return { lines: [], marks: [] };

  const rows = Math.min(deck.rows, Math.ceil(cardCount / deck.cols));
  const cols = rows > 1 ? deck.cols : Math.min(deck.cols, cardCount);
  const half = deck.gap / 2;
  const xAt = (col: number) => deck.startX - half + col * (deck.cardWidth + deck.gap);
  const yAt = (row: number) => deck.topY + half - row * (deck.cardHeight + deck.gap);
  const left = xAt(0);
  const right = xAt(cols);
  const top = yAt(0);
  const bottom = yAt(rows);

  // Una marca sale de la orilla del grupo hacia afuera y se acorta si no cabe en lo que la impresora alcanza.
  const markSpan = (edge: number, outward: 1 | -1, limit: number): [number, number] => {
    const start = edge + outward * CUT_MARK_GAP_PT;
    const end = start + outward * CUT_MARK_LENGTH_PT;
    return [start, outward === 1 ? Math.min(end, limit) : Math.max(end, limit)];
  };
  const [aboveStart, aboveEnd] = markSpan(top, 1, deck.areaTop - CUT_MARK_GAP_PT);
  const [belowStart, belowEnd] = markSpan(bottom, -1, PRINT_SAFE_MARGIN_PT);
  const [leftStart, leftEnd] = markSpan(left, -1, PRINT_SAFE_MARGIN_PT);
  const [rightStart, rightEnd] = markSpan(right, 1, deck.pageWidth - PRINT_SAFE_MARGIN_PT);

  const columnXs = Array.from({ length: cols + 1 }, (_, col) => xAt(col));
  const rowYs = Array.from({ length: rows + 1 }, (_, row) => yAt(row));

  return {
    lines: [
      ...columnXs.map((x) => ({ start: { x, y: bottom }, end: { x, y: top } })),
      ...rowYs.map((y) => ({ start: { x: left, y }, end: { x: right, y } })),
    ],
    marks: [
      ...columnXs.flatMap((x) => [
        { start: { x, y: aboveStart }, end: { x, y: aboveEnd } },
        { start: { x, y: belowStart }, end: { x, y: belowEnd } },
      ]),
      ...rowYs.flatMap((y) => [
        { start: { x: leftStart, y }, end: { x: leftEnd, y } },
        { start: { x: rightStart, y }, end: { x: rightEnd, y } },
      ]),
    ],
  };
}
