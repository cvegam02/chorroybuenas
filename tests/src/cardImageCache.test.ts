import { describe, expect, it } from 'vitest';
import { isCachedFor } from '../../src/utils/indexedDB';

describe('isCachedFor', () => {
  it('sin copia guardada, no vale', () => {
    expect(isCachedFor(undefined, 'u1/c1_1.jpg')).toBe(false);
    expect(isCachedFor(null)).toBe(false);
  });

  it('vale si es del mismo archivo', () => {
    expect(isCachedFor({ path: 'u1/c1_1.jpg' }, 'u1/c1_1.jpg')).toBe(true);
  });

  it('no vale si la carta ya apunta a otro archivo (la IA guardó la imagen nueva en el servidor)', () => {
    expect(isCachedFor({ path: 'u1/c1_1.jpg' }, 'u1/ai/c1_2.webp')).toBe(false);
  });

  it('una copia sin ruta no vale para una carta de la cuenta', () => {
    expect(isCachedFor({}, 'u1/ai/c1_2.webp')).toBe(false);
  });

  it('sin ruta (sin sesión) vale cualquier copia', () => {
    expect(isCachedFor({})).toBe(true);
    expect(isCachedFor({ path: 'u1/c1_1.jpg' })).toBe(true);
  });
});
