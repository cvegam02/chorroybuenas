import { describe, expect, it } from 'vitest';
import { nextCardNumber, queueItemState, queuePercent, readingPercent } from '../../src/utils/uploadQueue';

describe('número de la carta en «Así se verá» (FEAT-34, US A6)', () => {
  it('la carta nueva lleva el número siguiente al de la última', () => {
    expect(nextCardNumber(0)).toBe(1);
    expect(nextCardNumber(15)).toBe(16);
  });

  it('al subir varias cuenta las que ya se nombraron en esa tanda', () => {
    expect(nextCardNumber(15, 0)).toBe(16);
    expect(nextCardNumber(15, 2)).toBe(18);
  });
});

describe('cola de fotos en «Nombra tus fotos» (FEAT-34, US A6)', () => {
  it('marca las que ya pasaron, la actual y las que esperan', () => {
    expect([0, 1, 2, 3].map((index) => queueItemState(index, 1))).toEqual(['done', 'current', 'pending', 'pending']);
  });

  it('el avance cuenta la foto actual y se llena en la última', () => {
    expect(queuePercent(0, 3)).toBe(33);
    expect(queuePercent(1, 3)).toBe(67);
    expect(queuePercent(2, 3)).toBe(100);
  });

  it('sin fotos no hay avance', () => {
    expect(queuePercent(0, 0)).toBe(0);
  });
});

describe('avance al preparar las fotos (FEAT-52, US A1)', () => {
  it('va de 0 a 100 según las fotos leídas', () => {
    expect(readingPercent(0, 54)).toBe(0);
    expect(readingPercent(27, 54)).toBe(50);
    expect(readingPercent(54, 54)).toBe(100);
  });

  it('sin fotos o con una cuenta rara no se sale de 0 a 100', () => {
    expect(readingPercent(0, 0)).toBe(0);
    expect(readingPercent(60, 54)).toBe(100);
  });
});
