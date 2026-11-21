import {
  BOARD_HEIGHT_PT,
  BOARD_TITLE_CAP_HEIGHT_PT,
  BOARD_TITLE_LINE_GAP_PT,
  BOARD_TITLE_LINE_THICKNESS_PT,
  BOARD_TITLE_SIZE_PT,
  BOARD_WIDTH_PT,
  CARD_BORDER_PT,
  CARD_GAP_PT,
  CUT_AREA_X_PT,
  CUT_AREA_Y_PT,
} from './constants';
import { boardBackgroundArea, boardLogoBox, boardTitleLayout, cutGuides } from './layout';

export interface SheetBox {
  /** Desde la esquina de arriba a la izquierda del área del fondo, en puntos. */
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface BoardSheetGeometry {
  /** Tamaño del área del fondo, en puntos: la vista previa guarda esta proporción. */
  width: number;
  height: number;
  /** Caja de la imagen del logo, con todo y sus orillas transparentes. */
  logo: SheetBox;
  /** Renglón del título: de la orilla de la cuadrícula a la otra; el texto va centrado y las líneas a sus lados. */
  title: { left: number; width: number; baseline: number; capHeight: number; size: number; lineGap: number; lineThickness: number };
  /** Casillas de las cartas, de izquierda a derecha y de arriba abajo. */
  cards: SheetBox[];
  cardBorder: number;
  /** Línea punteada por donde se recorta. */
  cutLine: SheetBox;
}

/**
 * Las medidas de una página de tablero del PDF (FEAT-67), contadas desde arriba a la izquierda del área
 * del fondo, para dibujar en pantalla el tablero tal cual sale impreso.
 */
export function boardSheetGeometry(
  gridSize: 9 | 16,
  logoPosition: 'left' | 'center' | 'right' = 'center',
  logoAspect: number = 1
): BoardSheetGeometry {
  const area = boardBackgroundArea();
  const areaTop = area.y + area.height;
  const toBox = (box: { x: number; y: number; width: number; height: number }): SheetBox => ({
    left: box.x - area.x,
    top: areaTop - (box.y + box.height),
    width: box.width,
    height: box.height,
  });

  const size = gridSize === 9 ? 3 : 4;
  const cardWidth = (BOARD_WIDTH_PT - (size - 1) * CARD_GAP_PT) / size;
  const cardHeight = (BOARD_HEIGHT_PT - (size - 1) * CARD_GAP_PT) / size;
  const cards: SheetBox[] = [];
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      cards.push(
        toBox({
          x: CUT_AREA_X_PT + col * (cardWidth + CARD_GAP_PT),
          y: CUT_AREA_Y_PT + (size - 1 - row) * (cardHeight + CARD_GAP_PT),
          width: cardWidth,
          height: cardHeight,
        })
      );
    }
  }

  const { lines, text } = boardTitleLayout(0);
  const titleLeft = lines[0].start.x;
  const titleRight = lines[1].end.x;

  return {
    width: area.width,
    height: area.height,
    logo: toBox(boardLogoBox(logoAspect, logoPosition)),
    title: {
      left: titleLeft - area.x,
      width: titleRight - titleLeft,
      baseline: areaTop - text.y,
      capHeight: BOARD_TITLE_CAP_HEIGHT_PT,
      size: BOARD_TITLE_SIZE_PT,
      lineGap: BOARD_TITLE_LINE_GAP_PT,
      lineThickness: BOARD_TITLE_LINE_THICKNESS_PT,
    },
    cards,
    cardBorder: CARD_BORDER_PT,
    cutLine: toBox(cutGuides().line),
  };
}
