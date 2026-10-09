import { describe, expect, it } from 'vitest';
import { deckGridLayout } from '../../src/services/pdf/layout';

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
