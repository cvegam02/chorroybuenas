import type { Card } from '../types';

/**
 * Tableros frente a cartas borradas (FEAT-60, §4): al borrar una carta que está en algún tablero se borran los
 * tableros de la lotería, para que nunca quede uno con una carta que ya no existe. Cada tablero llega aquí como
 * la lista de ids de sus cartas.
 */

/** En cuántos tableros está la carta: si es más de cero, borrarla borra los tableros. */
export const boardsWithCard = (boards: readonly (readonly string[])[], cardId: string): number =>
  boards.filter((cardIds) => cardIds.includes(cardId)).length;

/** Algún tablero lleva una carta que ya no está en la lotería: esos tableros ya no sirven. */
export const boardsHaveMissingCards = (boards: readonly (readonly string[])[], cardIds: readonly string[]): boolean => {
  const present = new Set(cardIds);
  return boards.some((boardCardIds) => boardCardIds.some((id) => !present.has(id)));
};

/** Algún tablero tiene menos cartas que casillas: se le borró una carta. */
export const hasIncompleteBoard = (boards: readonly { gridSize: number; cardCount: number }[]): boolean =>
  boards.some((board) => board.cardCount < board.gridSize);

/**
 * Las cartas de un tablero son copias de cuando se cargó (US A3): cada casilla toma de la lotería la carta como está
 * ahora (nombre, imagen, IA) y su número, para que editarla se vea en el tablero y en el PDF. La imagen de la copia
 * solo se usa si la carta actual aún no la tiene y es la misma foto. Si la carta ya no está, la casilla queda igual.
 */
export const withLiveCards = <C extends Card, B extends { cards: C[] }>(boards: readonly B[], cards: readonly Card[]): B[] => {
  const liveById = new Map(cards.map((card, index) => [card.id, { card, number: index + 1 }]));
  return boards.map((board) => ({
    ...board,
    cards: board.cards.map((copy) => {
      const live = liveById.get(copy.id);
      if (!live) return copy;
      const sameImage = live.card.imagePath === copy.imagePath;
      return { ...copy, ...live.card, image: live.card.image ?? (sameImage ? copy.image : undefined), number: live.number };
    }),
  }));
};
