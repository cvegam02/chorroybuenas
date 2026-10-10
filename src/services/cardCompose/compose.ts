import { PDF_JPEG_QUALITY } from '../pdf/jpeg';
import { placeImageInCard } from '../pdf/layout';
import {
  CARD_FONT_FAMILY,
  CARD_FONT_WEIGHT,
  CARD_INK_COLOR,
  CARD_MARGIN_COLOR,
  CARD_NAME_COLOR,
  CARD_NAME_LINE_HEIGHT_RATIO,
  COMPOSED_CARD_WIDTH_PX,
  TEXT_OUTLINE_RATIO,
  TEXT_SHADOW_BLUR_RATIO,
  TEXT_SHADOW_COLOR,
  TEXT_SHADOW_OFFSET_RATIO,
} from './constants';
import { loadCardFont } from './font';
import type { CardComposer } from './input';
import { cardComposeLayout, cardNameText, fitCardName, type CardComposeLayout, type Rect } from './layout';

/** Fondo de la carta sin marco, por si la ilustración trae transparencia. */
const UNFRAMED_BACKGROUND = '#ffffff';

const decodeImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('No se pudo leer la foto de la carta'));
    img.src = src;
  });

/** Una foto remota se descarga primero: dibujada directo desde otra dirección, el lienzo ya no se podría exportar. */
const loadPhoto = async (src: string): Promise<HTMLImageElement> => {
  if (!/^https?:/.test(src)) return decodeImage(src);

  const response = await fetch(src, { mode: 'cors' });
  if (!response.ok) throw new Error(`No se pudo leer la foto de la carta (HTTP ${response.status})`);
  const url = URL.createObjectURL(await response.blob());
  try {
    return await decodeImage(url);
  } finally {
    URL.revokeObjectURL(url);
  }
};

const fontOfSize = (size: number) => `${CARD_FONT_WEIGHT} ${size}px "${CARD_FONT_FAMILY}"`;

/** La foto llena su espacio; lo que sobra se recorta. */
const drawPhoto = (ctx: CanvasRenderingContext2D, img: HTMLImageElement, area: Rect) => {
  const placed = placeImageInCard(img.naturalWidth, img.naturalHeight, area.width, area.height, 'cover');

  ctx.save();
  ctx.beginPath();
  ctx.rect(area.x, area.y, area.width, area.height);
  ctx.clip();
  ctx.drawImage(img, area.x + placed.offsetX, area.y + placed.offsetY, placed.width, placed.height);
  ctx.restore();
};

/**
 * Texto blanco con contorno oscuro y una sombra difuminada detrás, para leerse en fotos claras y oscuras.
 * `lastBaseline` es la base del último renglón; los anteriores van encima.
 */
const drawOutlinedText = (ctx: CanvasRenderingContext2D, lines: string[], size: number, centerX: number, lastBaseline: number) => {
  const baselines = lines.map((_, index) => lastBaseline - (lines.length - 1 - index) * size * CARD_NAME_LINE_HEIGHT_RATIO);

  ctx.font = fontOfSize(size);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';

  // Primero todos los contornos con su sombra y luego los rellenos, para que la sombra de un renglón
  // no ensucie las letras del otro. El trazo va centrado en la orilla de la letra: la mitad de adentro
  // la tapa el relleno.
  ctx.save();
  ctx.shadowColor = TEXT_SHADOW_COLOR;
  ctx.shadowBlur = size * TEXT_SHADOW_BLUR_RATIO;
  ctx.shadowOffsetY = size * TEXT_SHADOW_OFFSET_RATIO;
  ctx.strokeStyle = CARD_INK_COLOR;
  ctx.lineWidth = size * TEXT_OUTLINE_RATIO * 2;
  lines.forEach((line, index) => ctx.strokeText(line, centerX, baselines[index]));
  ctx.restore();

  ctx.fillStyle = CARD_NAME_COLOR;
  lines.forEach((line, index) => ctx.fillText(line, centerX, baselines[index]));
};

const drawName = (ctx: CanvasRenderingContext2D, name: string, layout: CardComposeLayout) => {
  const text = cardNameText(name);
  if (!text) return;

  const measure = (candidate: string, size: number) => {
    ctx.font = fontOfSize(size);
    return ctx.measureText(candidate).width + size * TEXT_OUTLINE_RATIO * 2;
  };
  const fitted = fitCardName(text, measure, layout.name);
  const lastBaseline = layout.name.bottom - fitted.size * TEXT_OUTLINE_RATIO;

  drawOutlinedText(ctx, fitted.lines, fitted.size, layout.name.centerX, lastBaseline);
};

/** Compone la carta en el navegador. */
export const composeCard: CardComposer = async ({ photo, name, framed }) => {
  const [img] = await Promise.all([loadPhoto(photo), loadCardFont()]);
  if (img.naturalWidth === 0 || img.naturalHeight === 0) {
    throw new Error('La foto de la carta tiene dimensiones inválidas (0x0)');
  }

  const layout = cardComposeLayout(COMPOSED_CARD_WIDTH_PX, framed);
  const canvas = document.createElement('canvas');
  canvas.width = layout.width;
  canvas.height = layout.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo preparar la composición de la carta');

  ctx.fillStyle = framed ? CARD_MARGIN_COLOR : UNFRAMED_BACKGROUND;
  ctx.fillRect(0, 0, layout.width, layout.height);
  if (layout.frame) {
    ctx.fillStyle = CARD_INK_COLOR;
    ctx.fillRect(layout.frame.x, layout.frame.y, layout.frame.width, layout.frame.height);
  }

  drawPhoto(ctx, img, layout.photo);
  drawName(ctx, name, layout);

  return canvas.toDataURL('image/jpeg', PDF_JPEG_QUALITY);
};
