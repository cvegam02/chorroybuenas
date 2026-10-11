import { describe, expect, it } from 'vitest';
import {
  boardCountShortcuts,
  pickSample,
  pileSheetCards,
  sheetPileSize,
  stepBoardCount,
} from '../../src/utils/boardCountPicker';

describe('atajos de cantidad en C2 (FEAT-34, US A4)', () => {
  it('agrega el sugerido a la lista, en su lugar y marcado', () => {
    expect(boardCountShortcuts(12, 1000)).toEqual([
      { count: 8, isSuggested: false },
      { count: 10, isSuggested: false },
      { count: 12, isSuggested: true },
      { count: 16, isSuggested: false },
      { count: 20, isSuggested: false },
    ]);
  });

  it('si el sugerido ya es un atajo, se marca ese y no se repite', () => {
    const shortcuts = boardCountShortcuts(16, 1000);
    expect(shortcuts.map((s) => s.count)).toEqual([8, 10, 16, 20]);
    expect(shortcuts.filter((s) => s.isSuggested)).toEqual([{ count: 16, isSuggested: true }]);
  });

  it('un sugerido menor que todos los atajos va primero', () => {
    expect(boardCountShortcuts(5, 1000).map((s) => s.count)).toEqual([5, 8, 10, 16, 20]);
  });

  it('no ofrece cantidades por encima del máximo que se puede generar', () => {
    expect(boardCountShortcuts(9, 12).map((s) => s.count)).toEqual([8, 9, 10]);
  });

  it('sin tableros posibles no hay atajos', () => {
    expect(boardCountShortcuts(8, 0)).toEqual([]);
  });
});

describe('botones − y + de C2 (FEAT-34, US A4)', () => {
  it('suben y bajan de uno en uno', () => {
    expect(stepBoardCount(12, 1, 100)).toBe(13);
    expect(stepBoardCount(12, -1, 100)).toBe(11);
  });

  it('no bajan de 1 ni pasan del máximo', () => {
    expect(stepBoardCount(1, -1, 100)).toBe(1);
    expect(stepBoardCount(100, 1, 100)).toBe(100);
  });

  it('desde un número escrito fuera de rango regresan al rango', () => {
    expect(stepBoardCount(0, -1, 100)).toBe(1);
    expect(stepBoardCount(500, 1, 100)).toBe(100);
  });
});

describe('pila de hojas de muestra en C2 (FEAT-34, US A4)', () => {
  it('tiene 2 hojas hasta 8 tableros, 3 hasta 12, 4 hasta 20 y 5 con más', () => {
    expect([2, 8].map(sheetPileSize)).toEqual([2, 2]);
    expect([9, 12].map(sheetPileSize)).toEqual([3, 3]);
    expect([13, 20].map(sheetPileSize)).toEqual([4, 4]);
    expect([21, 300].map(sheetPileSize)).toEqual([5, 5]);
  });

  it('con un solo tablero es una sola hoja, y nunca queda vacía', () => {
    expect(sheetPileSize(1)).toBe(1);
    expect(sheetPileSize(0)).toBe(1);
  });
});

describe('cartas de la muestra en C2 (FEAT-34, US A4)', () => {
  const deck = Array.from({ length: 24 }, (_, i) => `carta-${i + 1}`);

  it('toma 16 cartas en Clásico y 9 en Kids, sin repetir', () => {
    expect(new Set(pickSample(deck, 16)).size).toBe(16);
    expect(new Set(pickSample(deck, 9)).size).toBe(9);
  });

  it('solo usa cartas de la baraja y no la cambia', () => {
    const before = [...deck];
    const sample = pickSample(deck, 16);
    expect(sample.every((card) => deck.includes(card))).toBe(true);
    expect(deck).toEqual(before);
  });

  it('con menos cartas de las que caben usa las que hay', () => {
    expect(pickSample(['a', 'b'], 9).sort()).toEqual(['a', 'b']);
  });

  it('las hojas de atrás usan las mismas cartas en otro orden', () => {
    const sample = pickSample(deck, 16, () => 0);
    const back = pileSheetCards(sample, 1);
    expect(back).not.toEqual(sample);
    expect([...back].sort()).toEqual([...sample].sort());
    expect(pileSheetCards(sample, 0)).toEqual(sample);
  });
});
