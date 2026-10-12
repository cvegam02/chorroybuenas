import { describe, expect, it } from 'vitest';
import { BOARD_CELLS, PLAYS, boardCellTone } from '../../src/utils/playBoards';

describe('tableritos de las jugadas (FEAT-33, US A5)', () => {
  it('el color de la casilla i es el (i × 3) mod 8 de los ocho colores', () => {
    expect(BOARD_CELLS.slice(0, 8).map(boardCellTone)).toEqual([1, 4, 7, 2, 5, 8, 3, 6]);
    expect(boardCellTone(8)).toBe(1);
    expect(boardCellTone(15)).toBe(6);
  });

  it('cada jugada marca las casillas acordadas', () => {
    const marked = Object.fromEntries(PLAYS.map((play) => [play.id, play.marked]));
    expect(marked.chorro).toEqual([4, 5, 6, 7]);
    expect(marked.centro).toEqual([5, 6, 9, 10]);
    expect(marked.esquinas).toEqual([0, 3, 12, 15]);
    expect(marked.lleno).toHaveLength(16);
  });
});
