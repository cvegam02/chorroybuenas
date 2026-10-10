/**
 * Cartas ya terminadas de una lotería de temporada (FEAT-23): llegan con el nombre dibujado,
 * así que nunca se recortan. Si no vienen en 2:3 se acomodan enteras sobre fondo blanco.
 */

import type { GridSize } from '../types';
import { MIN_CARDS_BY_GRID } from './gridRules';

export const SEASONAL_EXPECTED_CARDS = 54;
export const SEASONAL_CARD_RATIO = 2 / 3;
/** Diferencia relativa que se acepta como redondeo al exportar la imagen. */
export const SEASONAL_CARD_RATIO_TOLERANCE = 0.01;
/** Más detalle que la lotería normal (512 × 768): este PDF se vende y se imprime. */
export const SEASONAL_CARD_MAX_WIDTH = 1000;
export const SEASONAL_CARD_UPLOAD_MAX_BYTES = 15 * 1024 * 1024;
export const SEASONAL_CARD_ACCEPTED_MIME_TYPES: readonly string[] = ['image/png', 'image/jpeg', 'image/webp'];
export const SEASONAL_CARD_OUTPUT_MIME_TYPE = 'image/jpeg';
const SEASONAL_CARD_OUTPUT_QUALITY = 0.9;

export interface CardPlacement {
  canvas: { width: number; height: number };
  image: { x: number; y: number; width: number; height: number };
}

export interface CardCountStatus {
  kind: 'missing' | 'extra' | 'exact';
  difference: number;
}

export interface PreparedCard {
  blob: Blob;
  /** La imagen original no venía en 2:3: se acomodó entera, con franjas blancas. */
  offRatio: boolean;
}

export function isCardRatio(width: number, height: number): boolean {
  if (width <= 0 || height <= 0) return false;
  return Math.abs(width / height - SEASONAL_CARD_RATIO) / SEASONAL_CARD_RATIO <= SEASONAL_CARD_RATIO_TOLERANCE;
}

/** Tamaño de la carta (siempre 2:3) y dónde va la imagen para caber entera, sin agrandarla. */
export function placeCardImage(width: number, height: number): CardPlacement {
  // La carta más chica en 2:3 que contiene la imagen a su tamaño original.
  const neededWidth = Math.max(width, height * SEASONAL_CARD_RATIO);
  const canvasWidth = Math.max(2, Math.round(Math.min(SEASONAL_CARD_MAX_WIDTH, neededWidth) / 2) * 2);
  const canvasHeight = canvasWidth / SEASONAL_CARD_RATIO;

  const scale = Math.min(canvasWidth / width, canvasHeight / height);
  const imageWidth = width * scale;
  const imageHeight = height * scale;
  return {
    canvas: { width: canvasWidth, height: canvasHeight },
    image: {
      x: (canvasWidth - imageWidth) / 2,
      y: (canvasHeight - imageHeight) / 2,
      width: imageWidth,
      height: imageHeight,
    },
  };
}

export function cardCountStatus(count: number, expected: number = SEASONAL_EXPECTED_CARDS): CardCountStatus {
  if (count < expected) return { kind: 'missing', difference: expected - count };
  if (count > expected) return { kind: 'extra', difference: count - expected };
  return { kind: 'exact', difference: 0 };
}

/**
 * Mínimo de cartas de una lotería temática. Kids (3×3) baja a 9, una carta por casilla
 * (FEAT-24, US A5); Clásico (4×4) conserva el de la lotería normal (contexto-negocio §4).
 */
export const SEASONAL_MIN_CARDS_BY_GRID: Record<GridSize, number> = {
  9: 9,
  16: MIN_CARDS_BY_GRID[16],
};

export const seasonalMinCards = (gridSize: GridSize): number => SEASONAL_MIN_CARDS_BY_GRID[gridSize];

export function hasEnoughCards(count: number, gridSize: GridSize): boolean {
  return count >= seasonalMinCards(gridSize);
}

export function validateCardFile(file: { type: string; size: number }): string | null {
  if (!SEASONAL_CARD_ACCEPTED_MIME_TYPES.includes(file.type)) return 'No es una imagen PNG, JPG o WebP.';
  if (file.size > SEASONAL_CARD_UPLOAD_MAX_BYTES) return 'Pesa más de 15 MB.';
  return null;
}

/** Deja la imagen como carta 2:3 sin recortarla. Solo funciona en el navegador. */
export async function prepareSeasonalCard(file: Blob): Promise<PreparedCard> {
  const bitmap = await createImageBitmap(file);
  try {
    const { canvas: size, image } = placeCardImage(bitmap.width, bitmap.height);
    const canvas = document.createElement('canvas');
    canvas.width = size.width;
    canvas.height = size.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('El navegador no permite preparar la imagen.');

    // Fondo blanco: son las franjas de una carta que no viene en 2:3, y el JPEG no guarda transparencia.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size.width, size.height);
    ctx.drawImage(bitmap, image.x, image.y, image.width, image.height);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => (result ? resolve(result) : reject(new Error('No se pudo preparar la imagen.'))),
        SEASONAL_CARD_OUTPUT_MIME_TYPE,
        SEASONAL_CARD_OUTPUT_QUALITY,
      );
    });
    return { blob, offRatio: !isCardRatio(bitmap.width, bitmap.height) };
  } finally {
    bitmap.close();
  }
}
