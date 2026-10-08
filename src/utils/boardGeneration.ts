/**
 * Generación de tableros y cuántos conviene generar (docs/contexto-negocio.md §4).
 * Sin estado ni almacenamiento: lo usan la lotería normal y la de temporada (FEAT-23).
 */

import type { GridSize } from '../types';

/** Intentos por tablero para encontrar uno que no repita a los anteriores. */
const MAX_ATTEMPTS = 1000;

// Fisher-Yates shuffle algorithm
const shuffleArray = <T,>(array: readonly T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

/** Las mismas cartas en otro orden cuentan como el mismo tablero. */
const boardKey = (cards: readonly { id: string }[]): string =>
  cards
    .map((card) => card.id)
    .sort()
    .join('|');

// Calculate binomial coefficient C(n, k) = n! / (k! * (n-k)!)
const binomialCoefficient = (n: number, k: number): number => {
  if (k > n || k < 0) return 0;
  if (k === 0 || k === n) return 1;

  // Use iterative approach to avoid overflow
  let result = 1;
  const minK = Math.min(k, n - k);

  for (let i = 0; i < minK; i++) {
    result = (result * (n - i)) / (i + 1);
  }

  return Math.round(result);
};

/** Tableros distintos que se pueden pedir: la mitad del máximo teórico, para que generarlos no se atore. */
export const maxUniqueBoards = (availableCards: number, gridSize: GridSize): number => {
  if (availableCards < gridSize) return 0;
  return Math.floor(binomialCoefficient(availableCards, gridSize) * 0.5);
};

/**
 * Clásico (4×4): la cantidad que hace que cada carta aparezca unas 8 veces.
 * Kids (3×3): un tablero por cada 3 cartas.
 */
export const suggestedBoardCount = (availableCards: number, gridSize: GridSize): number => {
  if (availableCards < gridSize) {
    return 8; // Default if not enough cards (won't be used anyway)
  }

  const idealBoards = gridSize === 9 ? Math.floor(availableCards / 3) : Math.round((availableCards * 8) / gridSize);
  const max = maxUniqueBoards(availableCards, gridSize);

  // Never less than 1, but also never more than max unique
  return Math.max(1, Math.min(idealBoards, max));
};

/**
 * Tableros al azar, sin cartas repetidas dentro de un tablero y sin dos tableros iguales.
 * Si tras muchos intentos no sale uno distinto, se acepta el repetido para no quedarse atorado.
 */
export function generateUniqueBoards<T extends { id: string }>(
  cards: readonly T[],
  count: number,
  gridSize: GridSize,
): T[][] {
  if (cards.length < gridSize) return [];

  const boards: T[][] = [];
  const seen = new Set<string>();

  for (let i = 0; i < count; i++) {
    let selected = shuffleArray(cards).slice(0, gridSize);
    for (let attempts = 0; seen.has(boardKey(selected)) && attempts < MAX_ATTEMPTS; attempts++) {
      selected = shuffleArray(cards).slice(0, gridSize);
    }
    seen.add(boardKey(selected));
    boards.push(selected);
  }

  return boards;
}
