import { describe, expect, it } from 'vitest';
import { deckSheetCount, DECK_TILE_SAMPLE_SIZE, deckTileSample } from '../../src/utils/boardPreviewSummary';
import { deckGridLayout, deckPages } from '../../src/services/pdf/layout';

describe('tarjeta de la baraja en C3 (FEAT-34, US A5)', () => {
  it('cuenta las hojas de la baraja: 10 cartas por hoja', () => {
    expect(deckSheetCount(10)).toBe(1);
    expect(deckSheetCount(15)).toBe(2);
    expect(deckSheetCount(24)).toBe(3);
    expect(deckSheetCount(54)).toBe(6);
  });

  it('sin cartas no hay hojas', () => {
    expect(deckSheetCount(0)).toBe(0);
  });

  it('dice las mismas hojas que arma el PDF', () => {
    const deck = deckGridLayout();
    for (const cardCount of [1, 9, 10, 11, 24, 30, 54]) {
      const cards = Array.from({ length: cardCount }, (_, i) => i);
      expect(deckSheetCount(cardCount)).toBe(deckPages(cards, deck).length);
    }
  });

  it('dibuja las primeras cartas de la baraja, sin cambiarla', () => {
    const cards = ['a', 'b', 'c', 'd', 'e', 'f'];
    expect(deckTileSample(cards)).toEqual(cards.slice(0, DECK_TILE_SAMPLE_SIZE));
    expect(deckTileSample(['a'])).toEqual(['a']);
    expect(cards).toHaveLength(6);
  });
});
