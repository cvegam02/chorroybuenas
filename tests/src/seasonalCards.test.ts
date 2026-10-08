import { describe, expect, it } from 'vitest';
import {
  SEASONAL_CARD_MAX_WIDTH,
  SEASONAL_CARD_UPLOAD_MAX_BYTES,
  SEASONAL_EXPECTED_CARDS,
  cardCountStatus,
  hasEnoughCards,
  isCardRatio,
  placeCardImage,
  validateCardFile,
} from '../../src/utils/seasonalCards';

describe('proporción de una carta de temporada (FEAT-23, decisión 2)', () => {
  it('reconoce las imágenes 2:3', () => {
    expect(isCardRatio(1000, 1500)).toBe(true);
    expect(isCardRatio(512, 768)).toBe(true);
    expect(isCardRatio(2000, 3000)).toBe(true);
  });

  it('tolera una diferencia de redondeo', () => {
    expect(isCardRatio(1000, 1499)).toBe(true);
    expect(isCardRatio(667, 1000)).toBe(true);
  });

  it('marca las que vienen en otra proporción', () => {
    expect(isCardRatio(1000, 1000)).toBe(false);
    expect(isCardRatio(1500, 1000)).toBe(false);
    expect(isCardRatio(700, 1100)).toBe(false);
    expect(isCardRatio(0, 0)).toBe(false);
  });
});

describe('acomodo de la imagen dentro de la carta (FEAT-23, decisión 2)', () => {
  it('una imagen 2:3 llena la carta completa', () => {
    const { canvas, image } = placeCardImage(2000, 3000);
    expect(canvas).toEqual({ width: SEASONAL_CARD_MAX_WIDTH, height: SEASONAL_CARD_MAX_WIDTH * 1.5 });
    expect(image).toEqual({ x: 0, y: 0, width: canvas.width, height: canvas.height });
  });

  it('la carta siempre queda en 2:3', () => {
    for (const [width, height] of [[3000, 3000], [4000, 1000], [500, 4000], [300, 450], [10, 10]]) {
      const { canvas } = placeCardImage(width, height);
      expect(canvas.width / canvas.height).toBeCloseTo(2 / 3, 2);
    }
  });

  it('una imagen de otra proporción cabe entera, sin recortarse ni deformarse', () => {
    for (const [width, height] of [[3000, 3000], [4000, 1000], [500, 4000], [700, 1100]]) {
      const { canvas, image } = placeCardImage(width, height);
      expect(image.x).toBeGreaterThanOrEqual(0);
      expect(image.y).toBeGreaterThanOrEqual(0);
      expect(image.x + image.width).toBeLessThanOrEqual(canvas.width + 0.001);
      expect(image.y + image.height).toBeLessThanOrEqual(canvas.height + 0.001);
      expect(image.width / image.height).toBeCloseTo(width / height, 2);
    }
  });

  it('una imagen cuadrada queda centrada, con franjas arriba y abajo', () => {
    const { canvas, image } = placeCardImage(3000, 3000);
    expect(image.width).toBeCloseTo(canvas.width);
    expect(image.x).toBeCloseTo(0);
    expect(image.y).toBeCloseTo((canvas.height - image.height) / 2);
    expect(image.y).toBeGreaterThan(0);
  });

  it('una imagen pequeña no se agranda', () => {
    const { canvas, image } = placeCardImage(300, 450);
    expect(canvas).toEqual({ width: 300, height: 450 });
    expect(image).toEqual({ x: 0, y: 0, width: 300, height: 450 });
  });
});

describe('cuántas cartas hay frente a las 54 esperadas (FEAT-23, decisión 3)', () => {
  it('avisa cuántas faltan', () => {
    expect(cardCountStatus(48)).toEqual({ kind: 'missing', difference: 6 });
    expect(cardCountStatus(0)).toEqual({ kind: 'missing', difference: SEASONAL_EXPECTED_CARDS });
  });

  it('avisa cuántas sobran', () => {
    expect(cardCountStatus(56)).toEqual({ kind: 'extra', difference: 2 });
  });

  it('con 54 no hay aviso', () => {
    expect(cardCountStatus(54)).toEqual({ kind: 'exact', difference: 0 });
  });

  it('no bloquea si llegan al mínimo de la lotería normal (24 en Clásico, 15 en Kids)', () => {
    expect(hasEnoughCards(48, 16)).toBe(true);
    expect(hasEnoughCards(24, 16)).toBe(true);
    expect(hasEnoughCards(15, 9)).toBe(true);
    expect(hasEnoughCards(60, 16)).toBe(true);
  });

  it('bloquea por debajo de ese mínimo', () => {
    expect(hasEnoughCards(23, 16)).toBe(false);
    expect(hasEnoughCards(14, 9)).toBe(false);
    expect(hasEnoughCards(0, 16)).toBe(false);
  });
});

describe('archivos aceptados como carta (FEAT-23)', () => {
  it('acepta PNG, JPEG y WebP', () => {
    for (const type of ['image/png', 'image/jpeg', 'image/webp']) {
      expect(validateCardFile({ type, size: 1024 })).toBeNull();
    }
  });

  it('rechaza lo que no es una imagen aceptada', () => {
    expect(validateCardFile({ type: 'application/pdf', size: 1024 })).not.toBeNull();
    expect(validateCardFile({ type: 'image/gif', size: 1024 })).not.toBeNull();
    expect(validateCardFile({ type: '', size: 1024 })).not.toBeNull();
  });

  it('rechaza una imagen demasiado pesada', () => {
    expect(validateCardFile({ type: 'image/png', size: SEASONAL_CARD_UPLOAD_MAX_BYTES })).toBeNull();
    expect(validateCardFile({ type: 'image/png', size: SEASONAL_CARD_UPLOAD_MAX_BYTES + 1 })).not.toBeNull();
  });
});
