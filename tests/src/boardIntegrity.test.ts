import { describe, expect, it } from 'vitest';
import { boardsHaveMissingCards, boardsWithCard, hasIncompleteBoard, withLiveCards } from '../../src/utils/boardIntegrity';

describe('tableros y cartas borradas (FEAT-60)', () => {
  const boards = [['a', 'b', 'c'], ['b', 'c', 'd'], ['c', 'd', 'e']];

  it('cuenta en cuántos tableros está una carta', () => {
    expect(boardsWithCard(boards, 'c')).toBe(3);
    expect(boardsWithCard(boards, 'a')).toBe(1);
    expect(boardsWithCard(boards, 'z')).toBe(0);
    expect(boardsWithCard([], 'a')).toBe(0);
  });

  it('avisa si algún tablero lleva una carta que ya no está en la lotería', () => {
    expect(boardsHaveMissingCards(boards, ['a', 'b', 'c', 'd', 'e', 'f'])).toBe(false);
    expect(boardsHaveMissingCards(boards, ['b', 'c', 'd', 'e'])).toBe(true);
    expect(boardsHaveMissingCards([], [])).toBe(false);
  });

  it('un tablero con menos cartas que casillas está incompleto', () => {
    expect(hasIncompleteBoard([{ gridSize: 16, cardCount: 16 }, { gridSize: 9, cardCount: 9 }])).toBe(false);
    expect(hasIncompleteBoard([{ gridSize: 16, cardCount: 16 }, { gridSize: 16, cardCount: 15 }])).toBe(true);
    expect(hasIncompleteBoard([])).toBe(false);
  });
});

describe('los tableros muestran la carta como está ahora (FEAT-60, US A3)', () => {
  it('cada casilla toma de la lotería el nombre, la imagen, la IA y el número actuales', () => {
    const boards = [{ id: 't1', gridSize: 16 as const, cards: [
      { id: 'a', title: 'Viejo', image: 'vieja.jpg', imagePath: 'u/a-1.jpg', isAiGenerated: false },
      { id: 'b', title: 'Otra', image: 'b.jpg' },
    ] }];
    const cards = [
      { id: 'b', title: 'Otra', image: 'b.jpg' },
      { id: 'a', title: 'Nuevo', image: 'nueva.jpg', imagePath: 'u/a-2.jpg', isAiGenerated: true },
    ];

    const [board] = withLiveCards(boards, cards);

    expect(board.id).toBe('t1');
    expect(board.cards.map((card) => card.id)).toEqual(['a', 'b']);
    expect(board.cards[0]).toMatchObject({ title: 'Nuevo', image: 'nueva.jpg', imagePath: 'u/a-2.jpg', isAiGenerated: true, number: 2 });
    expect(board.cards[1]).toMatchObject({ title: 'Otra', number: 1 });
  });

  it('una carta que ya no está en la lista se queda como venía', () => {
    const boards = [{ id: 't1', cards: [{ id: 'x', title: 'X', image: 'x.jpg' }] }];

    expect(withLiveCards(boards, [])[0].cards[0]).toMatchObject({ id: 'x', title: 'X', image: 'x.jpg' });
  });
});
