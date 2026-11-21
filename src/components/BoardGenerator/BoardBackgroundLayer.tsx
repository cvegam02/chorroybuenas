import { memo } from 'react';
import {
  OWN_IMAGE_VEIL_OPACITY,
  boardPatternShapes,
  type BoardBackground,
  type PatternShape,
} from '../../utils/boardBackgrounds';
import { boardBackgroundArea } from '../../services/pdf/layout';

interface BoardBackgroundLayerProps {
  background: BoardBackground;
  className?: string;
}

const shapeToSvg = (shape: PatternShape): string =>
  `<path d="${shape.d}" transform="translate(${shape.x} ${shape.y})" fill="${shape.fill ?? 'none'}"` +
  (shape.stroke ? ` stroke="${shape.stroke}" stroke-width="${shape.strokeWidth ?? 1}"` : '') +
  ` opacity="${shape.opacity}"/>`;

/** Imágenes ya armadas, una por fondo: todas las miniaturas con ese fondo usan la misma. */
const imageCache = new Map<string, string>();

/** El fondo como imagen SVG, con el color y las figuras del PDF medidas en puntos sobre el área del fondo. */
export function boardBackgroundImage(background: BoardBackground): string {
  const cached = imageCache.get(background.id);
  if (cached) return cached;
  const { width, height } = boardBackgroundArea();
  const shapes = boardPatternShapes(background, width, height).map(shapeToSvg).join('');
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid slice">` +
    `<rect width="${width}" height="${height}" fill="${background.base}"/>${shapes}</svg>`;
  const url = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  imageCache.set(background.id, url);
  return url;
}

/** Velo blanco de «Aclarar la imagen», encima de la imagen propia (US A2). */
const VEIL = `linear-gradient(color-mix(in srgb, var(--color-bg-surface) ${OWN_IMAGE_VEIL_OPACITY * 100}%, transparent), color-mix(in srgb, var(--color-bg-surface) ${OWN_IMAGE_VEIL_OPACITY * 100}%, transparent))`;

/** Lo que se pinta encima del color de base: la imagen propia (con su velo, si se aclara) o el patrón. */
function layerImage(background: BoardBackground): string | undefined {
  if (background.image) {
    const image = `url("${background.image.replace(/"/g, '%22')}")`;
    return background.lighten ? `${VEIL}, ${image}` : image;
  }
  return background.pattern ? boardBackgroundImage(background) : undefined;
}

/**
 * El fondo de un tablero en pantalla (FEAT-67): el mismo color y las mismas figuras que en el PDF. Llena a
 * quien lo contiene y recorta lo que no quepa. Va como una sola imagen que el navegador dibuja una vez
 * por fondo, aunque haya muchos tableros: un patrón son cientos de figuras.
 */
export const BoardBackgroundLayer = memo(function BoardBackgroundLayer({ background, className }: BoardBackgroundLayerProps) {
  return (
    <span
      className={className}
      aria-hidden="true"
      style={{
        display: 'block',
        backgroundColor: background.base,
        backgroundImage: layerImage(background),
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    />
  );
});
