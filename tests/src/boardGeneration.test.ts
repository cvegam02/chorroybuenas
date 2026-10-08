import { describe, expect, it } from 'vitest';
import { generateUniqueBoards, maxUniqueBoards, suggestedBoardCount } from '../../src/utils/boardGeneration';

const makeCards = (count: number) => Array.from({ length: count }, (_, i) => ({ id: `carta-${i + 1}` }));
const boardKey = (board: readonly { id: string }[]) => board.map((card) => card.id).sort().join('|');

describe('generación de tableros (contexto-negocio §4)', () => {
  it('genera la cantidad pedida, con las casillas del modo', () => {
    const classic = generateUniqueBoards(makeCards(54), 10, 16);
    expect(classic).toHaveLength(10);
    classic.forEach((board) => expect(board).toHaveLength(16));

    const kids = generateUniqueBoards(makeCards(54), 7, 9);
    expect(kids).toHaveLength(7);
    kids.forEach((board) => expect(board).toHaveLength(9));
  });

  it('ningún tablero repite una carta', () => {
    for (const board of generateUniqueBoards(makeCards(54), 30, 16)) {
      expect(new Set(board.map((card) => card.id)).size).toBe(board.length);
    }
  });

  it('no genera dos tableros iguales', () => {
    const boards = generateUniqueBoards(makeCards(24), 40, 16);
    expect(new Set(boards.map(boardKey)).size).toBe(boards.length);
  });

  it('solo usa cartas de la lotería y no las modifica', () => {
    const cards = makeCards(30);
    const snapshot = JSON.stringify(cards);
    const ids = new Set(cards.map((card) => card.id));
    for (const board of generateUniqueBoards(cards, 5, 16)) {
      board.forEach((card) => expect(ids.has(card.id)).toBe(true));
    }
    expect(JSON.stringify(cards)).toBe(snapshot);
  });

  it('sin cartas suficientes para un tablero no genera nada', () => {
    expect(generateUniqueBoards(makeCards(15), 3, 16)).toEqual([]);
    expect(generateUniqueBoards(makeCards(54), 0, 16)).toEqual([]);
  });
});

describe('cantidad sugerida y máxima de tableros (contexto-negocio §4)', () => {
  it('en Clásico, cada carta aparece unas 8 veces', () => {
    expect(suggestedBoardCount(54, 16)).toBe(27);
    expect(suggestedBoardCount(24, 16)).toBe(12);
  });

  it('en Kids, un tablero por cada 3 cartas', () => {
    expect(suggestedBoardCount(54, 9)).toBe(18);
    expect(suggestedBoardCount(15, 9)).toBe(5);
  });

  it('la sugerida nunca pasa del máximo de tableros distintos', () => {
    expect(maxUniqueBoards(16, 16)).toBe(0);
    expect(maxUniqueBoards(15, 16)).toBe(0);
    expect(maxUniqueBoards(17, 16)).toBe(8);
    expect(suggestedBoardCount(17, 16)).toBe(8);
    expect(suggestedBoardCount(18, 16)).toBeLessThanOrEqual(maxUniqueBoards(18, 16));
  });
});
