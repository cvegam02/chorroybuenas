import { describe, expect, it } from 'vitest';
import {
  generateSeasonalBoards,
  seasonalMaxBoards,
  seasonalSuggestedBoardCount,
  usesSameCardsOnEveryBoard,
} from '../../src/utils/seasonalBoards';
import { maxUniqueBoards, suggestedBoardCount } from '../../src/utils/boardGeneration';

const makeCards = (count: number) => Array.from({ length: count }, (_, i) => ({ id: `carta-${i + 1}` }));
const order = (board: readonly { id: string }[]) => board.map((card) => card.id).join('|');
const sameCards = (board: readonly { id: string }[]) => board.map((card) => card.id).sort().join('|');

describe('tableros de una temática con las cartas justas (FEAT-24, US A5)', () => {
  it('solo aplica cuando hay exactamente una carta por casilla', () => {
    expect(usesSameCardsOnEveryBoard(9, 9)).toBe(true);
    expect(usesSameCardsOnEveryBoard(10, 9)).toBe(false);
    expect(usesSameCardsOnEveryBoard(8, 9)).toBe(false);
  });

  it('con 9 cartas en 3×3 deja generar varios tableros y sugiere uno por cada 3 cartas', () => {
    expect(seasonalMaxBoards(9, 9)).toBeGreaterThan(100);
    expect(seasonalSuggestedBoardCount(9, 9)).toBe(3);
  });

  it('con 9 cartas todos los tableros llevan las mismas cartas, cada uno con un acomodo distinto', () => {
    const boards = generateSeasonalBoards(makeCards(9), 30, 9);

    expect(boards).toHaveLength(30);
    expect(new Set(boards.map(sameCards)).size).toBe(1);
    expect(new Set(boards.map(order)).size).toBe(30);
    for (const board of boards) {
      expect(new Set(board.map((card) => card.id)).size).toBe(9);
    }
  });

  it('con más cartas se comporta como la lotería normal', () => {
    expect(seasonalMaxBoards(15, 9)).toBe(maxUniqueBoards(15, 9));
    expect(seasonalSuggestedBoardCount(15, 9)).toBe(suggestedBoardCount(15, 9));

    const boards = generateSeasonalBoards(makeCards(15), 5, 9);
    expect(new Set(boards.map(sameCards)).size).toBe(5);
  });

  it('con menos cartas que casillas no genera nada', () => {
    expect(seasonalMaxBoards(8, 9)).toBe(0);
    expect(generateSeasonalBoards(makeCards(8), 3, 9)).toEqual([]);
  });
});
