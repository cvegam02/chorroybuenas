import type { Card } from '../types';

/**
 * Número de carta (FEAT-30): es el lugar de la carta en el orden en que se subieron las de su lotería.
 * No se guarda: se calcula de la lista, así que al borrar una carta las siguientes bajan un número solas.
 */
export const withCardNumbers = <T extends Card>(cards: T[]): T[] =>
  cards.map((card, index) => ({ ...card, number: index + 1 }));

/**
 * Le pone a cada carta el número que tiene en la lista ya numerada, buscándola por su identificador.
 * Sirve para las cartas de un tablero, que son copias: así llevan el mismo número que en la baraja.
 */
export const withNumbersFrom = <T extends Card>(cards: T[], numberedCards: Card[]): T[] => {
  const numberById = new Map(numberedCards.map((card) => [card.id, card.number]));
  return cards.map((card) => ({ ...card, number: numberById.get(card.id) }));
};
