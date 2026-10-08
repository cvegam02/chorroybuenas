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
