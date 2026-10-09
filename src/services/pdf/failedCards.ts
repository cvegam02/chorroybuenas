import type { Card } from '../../types';

/** Cuántos nombres de cartas fallidas caben en el aviso antes de cortar la lista. */
export const MAX_FAILED_CARD_NAMES = 8;

/** El PDF no se generó porque una o más cartas no se pudieron dibujar (FEAT-25, US A1). */
export class PdfCardsFailedError extends Error {
  readonly failedCards: readonly Card[];

  constructor(failedCards: readonly Card[]) {
    super(`PDF: ${failedCards.length} card(s) could not be drawn`);
    this.name = 'PdfCardsFailedError';
    this.failedCards = failedCards;
  }
}

/** Una carta que falla en varios tableros y en la baraja cuenta una sola vez. */
export function uniqueFailedCards(cards: readonly Card[]): Card[] {
  const byKey = new Map<string, Card>();
  for (const card of cards) {
    const key = card.id || card.title;
    if (!byKey.has(key)) byKey.set(key, card);
  }
  return [...byKey.values()];
}

/** Nombres para el aviso: separados por comas y, si son demasiados, cortados con «…». */
export function formatFailedCardNames(names: readonly string[], max: number = MAX_FAILED_CARD_NAMES): string {
  const shown = names.slice(0, max).join(', ');
  return names.length > max ? `${shown}…` : shown;
}
