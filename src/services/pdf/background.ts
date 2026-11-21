import { rgb, popGraphicsState, pushGraphicsState, rectangle, clip, endPath, type PDFPage, type RGB } from 'pdf-lib';
import {
  BOARD_BACKGROUND_EDGE,
  OWN_IMAGE_VEIL_OPACITY,
  boardPatternShapes,
  type BoardBackground,
} from '../../utils/boardBackgrounds';
import type { EmbedResult } from './images';
import { boardBackgroundArea, placeImageInCard } from './layout';

const hexToRgb = (hex: string): RGB =>
  rgb(
    parseInt(hex.slice(1, 3), 16) / 255,
    parseInt(hex.slice(3, 5), 16) / 255,
    parseInt(hex.slice(5, 7), 16) / 255
  );

const WHITE = rgb(1, 1, 1);

/** La imagen propia llena el área y se recorta lo que sobra; con «Aclarar la imagen», lleva el velo blanco. */
const drawOwnImage = (page: PDFPage, image: EmbedResult, lighten: boolean) => {
  const area = boardBackgroundArea();
  const placed = placeImageInCard(image.width, image.height, area.width, area.height, 'cover');
  page.pushOperators(pushGraphicsState(), rectangle(area.x, area.y, area.width, area.height), clip(), endPath());
  page.drawImage(image.image, {
    x: area.x + placed.offsetX,
    y: area.y + placed.offsetY,
    width: placed.width,
    height: placed.height,
  });
  page.pushOperators(popGraphicsState());
  if (lighten) page.drawRectangle({ ...area, color: WHITE, opacity: OWN_IMAGE_VEIL_OPACITY });
};

/**
 * Fondo de un tablero (FEAT-67): el color de base en toda el área, con su orilla fina, y encima las
 * figuras del patrón o la imagen propia, si los tiene. Va antes que todo lo demás, así que queda detrás
 * del logo y las cartas.
 */
export const drawBoardBackground = (page: PDFPage, background: BoardBackground, ownImage?: EmbedResult): void => {
  const area = boardBackgroundArea();
  page.drawRectangle({ ...area, color: hexToRgb(background.base) });

  if (ownImage) drawOwnImage(page, ownImage, background.lighten ?? true);

  // Las figuras cuentan desde arriba a la izquierda del área; el PDF, desde abajo.
  const top = area.y + area.height;
  for (const shape of boardPatternShapes(background, area.width, area.height)) {
    page.drawSvgPath(shape.d, {
      x: area.x + shape.x,
      y: top - shape.y,
      color: shape.fill ? hexToRgb(shape.fill) : undefined,
      opacity: shape.opacity,
      borderColor: shape.stroke ? hexToRgb(shape.stroke) : undefined,
      borderWidth: shape.stroke ? shape.strokeWidth : undefined,
      borderOpacity: shape.opacity,
    });
  }

  page.drawRectangle({ ...area, borderColor: hexToRgb(BOARD_BACKGROUND_EDGE), borderWidth: 1 });
};
