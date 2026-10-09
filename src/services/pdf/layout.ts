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
