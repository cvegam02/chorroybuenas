import { describe, expect, it } from 'vitest';
import { aiBatchPlan, batchCardState, cardsForBatch } from '../../src/utils/aiBatchPlan';

describe('cuenta de la IA en lote (FEAT-34, US A6)', () => {
  it('con saldo de sobra: 1 token por foto y el saldo que queda', () => {
    expect(aiBatchPlan(10, 20)).toEqual({
      photos: 10,
      tokens: 10,
      balanceAfter: 10,
      hasEnough: true,
      missing: 0,
      affordable: 10,
    });
  });

  it('con el saldo justo alcanza y queda en cero', () => {
    expect(aiBatchPlan(5, 5)).toMatchObject({ tokens: 5, balanceAfter: 0, hasEnough: true, missing: 0 });
  });

  it('sin saldo suficiente dice cuántos tokens faltan y para cuántas cartas alcanza', () => {
    expect(aiBatchPlan(10, 3)).toMatchObject({ photos: 10, tokens: 10, hasEnough: false, missing: 7, affordable: 3 });
  });

  it('sin tokens no alcanza para ninguna carta', () => {
    expect(aiBatchPlan(10, 0)).toMatchObject({ hasEnough: false, missing: 10, affordable: 0 });
  });

  it('al transformar solo las que alcanzan, la cuenta es de esas cartas', () => {
    expect(aiBatchPlan(10, 3, 3)).toEqual({
      photos: 3,
      tokens: 3,
      balanceAfter: 0,
      hasEnough: true,
      missing: 0,
      affordable: 3,
    });
  });

  it('un límite mayor que las cartas pendientes no agrega fotos ni tokens', () => {
    expect(aiBatchPlan(4, 10, 9)).toMatchObject({ photos: 4, tokens: 4, balanceAfter: 6 });
  });

  it('mientras no se conoce el saldo no se da por suficiente ni se inventa lo que falta', () => {
    expect(aiBatchPlan(10, null)).toEqual({
      photos: 10,
      tokens: 10,
      balanceAfter: null,
      hasEnough: false,
      missing: 0,
      affordable: 0,
    });
  });
});

describe('cartas que entran al lote (FEAT-34, US A6)', () => {
  const pending = ['a', 'b', 'c', 'd', 'e'];

  it('sin límite van todas las pendientes, como siempre', () => {
    expect(cardsForBatch(pending)).toEqual(pending);
  });

  it('con límite van las primeras, en el orden de la baraja', () => {
    expect(cardsForBatch(pending, 3)).toEqual(['a', 'b', 'c']);
  });

  it('un límite mayor que las pendientes no pasa de las que hay', () => {
    expect(cardsForBatch(pending, 99)).toEqual(pending);
  });

  it('un límite que no es un número entero positivo no transforma nada', () => {
    expect(cardsForBatch(pending, 0)).toEqual([]);
    expect(cardsForBatch(pending, -2)).toEqual([]);
    expect(cardsForBatch(pending, 2.5)).toEqual([]);
    expect(cardsForBatch(pending, Number.NaN)).toEqual([]);
    expect(cardsForBatch(pending, {} as unknown as number)).toEqual([]);
  });

  it('no cambia la lista de pendientes', () => {
    cardsForBatch(pending, 2);
    expect(pending).toHaveLength(5);
  });
});

describe('avance del lote, carta por carta (FEAT-34, US A6)', () => {
  it('las que ya pasaron están listas, o rechazadas si quedaron sin IA', () => {
    expect(batchCardState(0, 2, true)).toBe('done');
    expect(batchCardState(1, 2, false)).toBe('rejected');
  });

  it('la actual y las que esperan', () => {
    expect(batchCardState(2, 2, false)).toBe('current');
    expect(batchCardState(3, 2, false)).toBe('pending');
  });
});
