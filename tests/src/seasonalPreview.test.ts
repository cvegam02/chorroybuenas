import { describe, expect, it } from 'vitest';
import {
  PREVIEW_MAX_SIDE,
  PREVIEW_UPLOAD_MAX_BYTES,
  fitWithin,
  moveItem,
  removeAt,
  validatePreviewImage,
} from '../../src/utils/seasonalPreview';

describe('tamaño de las vistas previas (FEAT-17, decisión 4)', () => {
  it('ningún lado pasa de 600 px', () => {
    for (const [width, height] of [[3000, 2000], [2000, 3000], [5000, 5000], [601, 10], [10, 601], [9000, 1]]) {
      const size = fitWithin(width, height);
      expect(size.width).toBeLessThanOrEqual(PREVIEW_MAX_SIDE);
      expect(size.height).toBeLessThanOrEqual(PREVIEW_MAX_SIDE);
      expect(size.width).toBeGreaterThanOrEqual(1);
      expect(size.height).toBeGreaterThanOrEqual(1);
    }
  });

  it('conserva la proporción', () => {
    expect(fitWithin(3000, 2000)).toEqual({ width: 600, height: 400 });
    expect(fitWithin(2000, 3000)).toEqual({ width: 400, height: 600 });
    expect(fitWithin(1200, 1200)).toEqual({ width: 600, height: 600 });
    // Una carta de lotería: 5:8.
    expect(fitWithin(1000, 1600)).toEqual({ width: 375, height: 600 });
  });

  it('una imagen chica no se agranda', () => {
    expect(fitWithin(300, 200)).toEqual({ width: 300, height: 200 });
    expect(fitWithin(600, 600)).toEqual({ width: 600, height: 600 });
  });

  it('rechaza medidas que no son de una imagen', () => {
    expect(() => fitWithin(0, 100)).toThrow();
    expect(() => fitWithin(100, -1)).toThrow();
    expect(() => fitWithin(Number.NaN, 100)).toThrow();
  });
});

describe('orden de las cartas de muestra', () => {
  const samples = ['a', 'b', 'c', 'd'] as const;

  it('mueve la última al primer lugar', () => {
    expect(moveItem(samples, 3, 0)).toEqual(['d', 'a', 'b', 'c']);
  });

  it('mueve la primera al final y una hacia el medio', () => {
    expect(moveItem(samples, 0, 3)).toEqual(['b', 'c', 'd', 'a']);
    expect(moveItem(samples, 1, 2)).toEqual(['a', 'c', 'b', 'd']);
  });

  it('un movimiento al mismo lugar o fuera de la lista no cambia nada', () => {
    expect(moveItem(samples, 2, 2)).toEqual(['a', 'b', 'c', 'd']);
    expect(moveItem(samples, -1, 2)).toEqual(['a', 'b', 'c', 'd']);
    expect(moveItem(samples, 1, 4)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('quita una y conserva el orden de las demás', () => {
    expect(removeAt(samples, 1)).toEqual(['a', 'c', 'd']);
    expect(removeAt(samples, 9)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('no modifica la lista original', () => {
    const original = ['a', 'b', 'c'];
    moveItem(original, 2, 0);
    removeAt(original, 0);
    expect(original).toEqual(['a', 'b', 'c']);
  });
});

describe('imagen de portada o de muestra', () => {
  it('acepta PNG, JPEG y WebP de hasta 5 MB', () => {
    for (const type of ['image/png', 'image/jpeg', 'image/webp']) {
      expect(validatePreviewImage({ type, size: PREVIEW_UPLOAD_MAX_BYTES })).toBeNull();
    }
  });

  it('rechaza otros formatos', () => {
    for (const type of ['image/gif', 'image/svg+xml', 'application/pdf', '']) {
      expect(validatePreviewImage({ type, size: 1024 })).toContain('PNG, JPEG o WebP');
    }
  });

  it('rechaza una imagen de más de 5 MB', () => {
    expect(validatePreviewImage({ type: 'image/png', size: PREVIEW_UPLOAD_MAX_BYTES + 1 })).toContain('5 MB');
  });

  it('rechaza un archivo vacío', () => {
    expect(validatePreviewImage({ type: 'image/png', size: 0 })).not.toBeNull();
  });
});
