import type { GridSize } from '../types';

/**
 * Mínimo de cartas que debe tener una lotería para poder generar tableros, por modo:
 * Clásico (4×4) 24, Kids (3×3) 15. Regla de negocio: docs/contexto-negocio.md §4.
 * Único lugar donde vive este número: todas las pantallas lo toman de aquí.
 */
export const MIN_CARDS_BY_GRID: Record<GridSize, number> = {
  9: 15,
  16: 24,
};

export const minCardsForGrid = (gridSize: GridSize): number => MIN_CARDS_BY_GRID[gridSize];
