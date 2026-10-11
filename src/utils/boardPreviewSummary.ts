/** Pantalla C3 Vista previa (FEAT-34, US A5): la tarjeta «+ la baraja para recortar». */

import { DECK_COLS, DECK_ROWS } from '../services/pdf/constants';

/** Cartas que se dibujan en la tarjeta de la baraja. */
export const DECK_TILE_SAMPLE_SIZE = 4;

/** Hojas que ocupa la baraja al final del PDF: las mismas que reparte `deckPages`. */
export function deckSheetCount(cardCount: number): number {
  return Math.ceil(cardCount / (DECK_COLS * DECK_ROWS));
}

/** Las primeras cartas de la baraja, para el dibujo de la tarjeta. */
export function deckTileSample<T>(cards: readonly T[]): T[] {
  return cards.slice(0, DECK_TILE_SAMPLE_SIZE);
}
