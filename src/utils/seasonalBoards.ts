/**
 * Tableros de una lotería temática (FEAT-24, US A5). Igual que la lotería normal, salvo cuando hay
 * justo una carta por casilla (9 cartas en Kids): ahí todos los tableros llevan las mismas cartas
 * y lo único que cambia de uno a otro es el acomodo.
 */

import type { GridSize } from '../types';
import {
  generateArrangedBoards,
  generateUniqueBoards,
  maxArrangedBoards,
  maxUniqueBoards,
  suggestedBoardCount,
} from './boardGeneration';

/** Tableros sugeridos por carta cuando todos llevan las mismas: uno por cada 3, como en Kids. */
const CARDS_PER_SUGGESTED_BOARD = 3;

export const usesSameCardsOnEveryBoard = (availableCards: number, gridSize: GridSize): boolean =>
  availableCards === gridSize;

export const seasonalMaxBoards = (availableCards: number, gridSize: GridSize): number =>
  usesSameCardsOnEveryBoard(availableCards, gridSize)
    ? maxArrangedBoards(gridSize)
    : maxUniqueBoards(availableCards, gridSize);

export const seasonalSuggestedBoardCount = (availableCards: number, gridSize: GridSize): number =>
  usesSameCardsOnEveryBoard(availableCards, gridSize)
    ? Math.floor(availableCards / CARDS_PER_SUGGESTED_BOARD)
    : suggestedBoardCount(availableCards, gridSize);

export function generateSeasonalBoards<T extends { id: string }>(
  cards: readonly T[],
  count: number,
  gridSize: GridSize,
): T[][] {
  return usesSameCardsOnEveryBoard(cards.length, gridSize)
    ? generateArrangedBoards(cards, count)
    : generateUniqueBoards(cards, count, gridSize);
}
