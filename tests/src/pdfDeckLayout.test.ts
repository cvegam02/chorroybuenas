import { describe, expect, it } from 'vitest';
import { DECK_MARGIN_X_PT } from '../../src/services/pdf/constants';
import { deckCardPosition, deckGridLayout, deckPages, deckPageTitle } from '../../src/services/pdf/layout';

describe('la baraja queda centrada en la hoja (FEAT-26, US A4)', () => {
  const deck = deckGridLayout();
  const gridWidth = deck.cols * deck.cardWidth + (deck.cols - 1) * deck.gap;
  const gridHeight = deck.rows * deck.cardHeight + (deck.rows - 1) * deck.gap;

  it('la cuadrícula queda centrada a lo ancho de la hoja', () => {
    const freeLeft = deck.startX;
    const freeRight = deck.pageWidth - (deck.startX + gridWidth);

    expect(freeLeft).toBeCloseTo(freeRight, 5);
  });

  it('la cuadrícula queda centrada a lo alto del espacio que hay bajo el título', () => {
    const freeAbove = deck.areaTop - deck.topY;
    const freeBelow = deck.topY - gridHeight - deck.areaBottom;

    expect(freeAbove).toBeGreaterThan(0);
    expect(freeAbove).toBeCloseTo(freeBelow, 5);
  });

  it('el espacio para la cuadrícula empieza debajo del título de la página', () => {
    expect(deck.areaTop).toBeLessThan(deck.titleY);
    expect(deck.areaBottom).toBeGreaterThan(0);
  });
});

describe('acomodo de las cartas de la baraja (FEAT-28, US A3)', () => {
  const deck = deckGridLayout();
  const perPage = deck.cols * deck.rows;
  const positions = Array.from({ length: perPage }, (_, index) => deckCardPosition(deck, index));

  it('la primera carta va arriba a la izquierda', () => {
    expect(positions[0]).toEqual({ x: deck.startX, y: deck.topY - deck.cardHeight });
  });

  it('las cartas se llenan por filas, de izquierda a derecha y de arriba abajo', () => {
    const second = positions[1];
    const firstOfSecondRow = positions[deck.cols];

    expect(second.y).toBe(positions[0].y);
    expect(second.x - positions[0].x).toBeCloseTo(deck.cardWidth + deck.gap, 5);
    expect(firstOfSecondRow.x).toBe(positions[0].x);
    expect(positions[0].y - firstOfSecondRow.y).toBeCloseTo(deck.cardHeight + deck.gap, 5);
  });

  it('todas las cartas de una página caben en su espacio, sin salirse de la hoja', () => {
    for (const { x, y } of positions) {
      expect(x).toBeGreaterThanOrEqual(deck.startX);
      expect(x + deck.cardWidth).toBeLessThanOrEqual(deck.pageWidth - deck.startX + 1e-6);
      expect(y).toBeGreaterThanOrEqual(deck.areaBottom);
      expect(y + deck.cardHeight).toBeLessThanOrEqual(deck.areaTop);
    }
  });

  it('reparte la baraja en páginas llenas y deja el resto en la última', () => {
    const cards = Array.from({ length: 2 * perPage + 4 }, (_, i) => i);

    expect(deckPages(cards, deck).map((page) => page.length)).toEqual([perPage, perPage, 4]);
    expect(deckPages(cards, deck).flat()).toEqual(cards);
    expect(deckPages([], deck)).toEqual([]);
  });

  it('la primera página lleva el título y las siguientes avisan que son continuación', () => {
    expect(deckPageTitle(1)).toBe('Baraja Completa');
    expect(deckPageTitle(3)).toBe('Baraja Completa (continuación - Página 3)');
  });

  it('el título de la página empieza en el margen izquierdo, arriba de las cartas', () => {
    expect(deck.titleX).toBe(DECK_MARGIN_X_PT);
    expect(deck.titleY).toBeGreaterThan(deck.areaTop);
  });
});
