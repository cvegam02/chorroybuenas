import { describe, expect, it } from 'vitest';
import { aiDeckSummary } from '../../src/utils/deckProgress';

const card = (id: string, isAiGenerated = false) => ({ id, isAiGenerated });

describe('panel «Cartas con IA» de C1 (FEAT-34, US A3)', () => {
  it('cuenta las cartas ya transformadas y las que faltan', () => {
    const cards = [card('a', true), card('b', true), card('c'), card('d'), card('e')];
    expect(aiDeckSummary(cards)).toEqual({ total: 5, transformed: 2, remaining: 3 });
  });

  it('las que faltan son las mismas que transforma el lote: las que no tienen IA', () => {
    const cards = [card('a'), card('b')];
    expect(aiDeckSummary(cards).remaining).toBe(cards.filter((c) => !c.isAiGenerated).length);
  });

  it('una carta sin la marca de IA cuenta como sin transformar', () => {
    expect(aiDeckSummary([{ id: 'a' }, { id: 'b', isAiGenerated: undefined }])).toEqual({
      total: 2,
      transformed: 0,
      remaining: 2,
    });
  });

  it('sin cartas no hay nada que contar', () => {
    expect(aiDeckSummary([])).toEqual({ total: 0, transformed: 0, remaining: 0 });
  });
});
