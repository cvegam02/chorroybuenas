/** Tableritos de «Jugadas y premios» en ¿Cómo se juega? (FEAT-33, US A5). */

/** Casillas de un tablero de 4 × 4, numeradas de 0 a 15 por filas. */
export const BOARD_CELLS: readonly number[] = Array.from({ length: 16 }, (_, index) => index);

const CELL_TONES = 8;

/** Color de una casilla, del 1 al 8 (`--color-board-cell-N`): va rotando de tres en tres. */
export function boardCellTone(cell: number): number {
  return ((cell * 3) % CELL_TONES) + 1;
}

export type PlayId = 'chorro' | 'centro' | 'esquinas' | 'lleno';

/** Casillas que llevan frijol en cada jugada. */
export const PLAYS: readonly { id: PlayId; marked: readonly number[] }[] = [
  { id: 'chorro', marked: [4, 5, 6, 7] },
  { id: 'centro', marked: [5, 6, 9, 10] },
  { id: 'esquinas', marked: [0, 3, 12, 15] },
  { id: 'lleno', marked: BOARD_CELLS },
];
