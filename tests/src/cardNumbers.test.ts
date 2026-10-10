import { describe, expect, it } from 'vitest';
import type { Card } from '../../src/types';
import { withCardNumbers, withNumbersFrom } from '../../src/utils/cardNumbers';

const card = (id: string): Card => ({ id, title: `Carta ${id}` });

describe('número de carta (FEAT-30)', () => {
  it('las cartas se numeran 1, 2, 3… en el orden de la lista', () => {
    const numbered = withCardNumbers([card('a'), card('b'), card('c')]);

    expect(numbered.map((c) => [c.id, c.number])).toEqual([['a', 1], ['b', 2], ['c', 3]]);
  });

  it('al borrar una carta, las siguientes bajan un número', () => {
    const before = withCardNumbers([card('a'), card('b'), card('c')]);
    const after = withCardNumbers(before.filter((c) => c.id !== 'b'));

    expect(after.map((c) => [c.id, c.number])).toEqual([['a', 1], ['c', 2]]);
  });

  it('no cambia las cartas que recibe', () => {
    const cards = [card('a')];
    withCardNumbers(cards);

    expect(cards[0].number).toBeUndefined();
  });

  it('las cartas de un tablero toman el número que tienen en la lista de cartas', () => {
    const deck = withCardNumbers([card('a'), card('b'), card('c')]);
    const boardCards = withNumbersFrom([card('c'), card('a')], deck);

    expect(boardCards.map((c) => [c.id, c.number])).toEqual([['c', 3], ['a', 1]]);
  });

  it('una carta que no está en la lista queda sin número', () => {
    const deck = withCardNumbers([card('a')]);

    expect(withNumbersFrom([card('z')], deck)[0].number).toBeUndefined();
  });
});
