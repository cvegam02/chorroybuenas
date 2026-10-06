import { describe, expect, it } from 'vitest';
import { MIN_CARDS_BY_GRID, minCardsForGrid } from '../../src/utils/gridRules';

describe('mínimo de cartas por modo (contexto-negocio §4)', () => {
  it('Clásico (4×4) pide 24 cartas', () => {
    expect(minCardsForGrid(16)).toBe(24);
  });

  it('Kids (3×3) pide 15 cartas', () => {
    expect(minCardsForGrid(9)).toBe(15);
  });

  it('el mínimo siempre supera las cartas que caben en un tablero', () => {
    for (const [gridSize, min] of Object.entries(MIN_CARDS_BY_GRID)) {
      expect(min).toBeGreaterThan(Number(gridSize));
    }
  });
});
