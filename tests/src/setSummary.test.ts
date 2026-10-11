import { describe, expect, it } from 'vitest';
import es from '../../src/locales/es/translation.json';
import en from '../../src/locales/en/translation.json';
import { minCardsForGrid } from '../../src/utils/gridRules';
import { gridSizeOfSet, isNewAccount, parseSetSummaryRows, setStatusOf } from '../../src/utils/setSummary';

describe('estado de una lotería en Mi cuenta (FEAT-35, US A2)', () => {
  it('sin cartas, está sin fotos', () => {
    expect(setStatusOf({ cardCount: 0, boardCount: 0, gridSize: 16 })).toEqual({ kind: 'empty' });
  });

  it('por debajo del mínimo de su modo dice cuántas cartas faltan', () => {
    expect(setStatusOf({ cardCount: 6, boardCount: 0, gridSize: 9 })).toEqual({
      kind: 'missingCards',
      missing: minCardsForGrid(9) - 6,
    });
    expect(setStatusOf({ cardCount: 1, boardCount: 0, gridSize: 16 })).toEqual({
      kind: 'missingCards',
      missing: minCardsForGrid(16) - 1,
    });
  });

  it('el mínimo es el de cada modo: las mismas cartas alcanzan en Kids y no en Clásico', () => {
    const cardCount = minCardsForGrid(9);
    expect(setStatusOf({ cardCount, boardCount: 2, gridSize: 9 })).toEqual({ kind: 'ready' });
    expect(setStatusOf({ cardCount, boardCount: 2, gridSize: 16 }).kind).toBe('missingCards');
  });

  it('con cartas suficientes y sin tableros, le faltan los tableros', () => {
    expect(setStatusOf({ cardCount: minCardsForGrid(16), boardCount: 0, gridSize: 16 })).toEqual({
      kind: 'missingBoards',
    });
  });

  it('con cartas suficientes y al menos un tablero, está lista', () => {
    expect(setStatusOf({ cardCount: 30, boardCount: 1, gridSize: 16 })).toEqual({ kind: 'ready' });
  });

  it('aunque tenga tableros, si le faltan cartas no está lista', () => {
    expect(setStatusOf({ cardCount: 10, boardCount: 4, gridSize: 16 }).kind).toBe('missingCards');
  });

  it('una lotería sin modo guardado cuenta como Clásico', () => {
    expect(gridSizeOfSet({})).toBe(16);
    expect(gridSizeOfSet({ grid_size: null })).toBe(16);
    expect(gridSizeOfSet({ grid_size: 9 })).toBe(9);
  });
});

describe('resumen de las loterías (FEAT-35, US A2)', () => {
  const row = {
    id: 'set-1',
    card_count: [{ count: 30 }],
    board_count: [{ count: 4 }],
    preview: [
      { id: 'c1', title: 'La Chata', image_path: 'u/c1.png', is_ai_generated: true },
      { id: 'c2', title: 'Los Abuelos', image_path: null, is_ai_generated: null },
    ],
  };

  it('lee conteos y cartas del abanico', () => {
    expect(parseSetSummaryRows([row])).toEqual([
      {
        setId: 'set-1',
        cardCount: 30,
        boardCount: 4,
        previewCards: [
          { id: 'c1', title: 'La Chata', imagePath: 'u/c1.png', isAiGenerated: true },
          { id: 'c2', title: 'Los Abuelos', imagePath: null, isAiGenerated: false },
        ],
      },
    ]);
  });

  it('una lotería sin cartas ni tableros da ceros', () => {
    const empty = { id: 'set-2', card_count: [], board_count: [{ count: 0 }], preview: [] };
    expect(parseSetSummaryRows([empty])).toEqual([{ setId: 'set-2', cardCount: 0, boardCount: 0, previewCards: [] }]);
  });

  it('nunca deja pasar más de tres cartas al abanico', () => {
    const many = { ...row, preview: [1, 2, 3, 4, 5].map((n) => ({ id: `c${n}`, title: `Carta ${n}` })) };
    expect(parseSetSummaryRows([many])[0].previewCards.map((card) => card.id)).toEqual(['c1', 'c2', 'c3']);
  });

  it('rechaza una respuesta con otra forma en lugar de inventar conteos', () => {
    expect(() => parseSetSummaryRows([{ id: 'set-1' }])).toThrow();
    expect(() => parseSetSummaryRows(null)).toThrow();
  });
});

describe('cuenta nueva (FEAT-35, decisión 10)', () => {
  const summaries = (cardCount: number) => new Map([['set-1', { cardCount }]]);

  it('una sola lotería y sin cartas es una cuenta nueva', () => {
    expect(isNewAccount([{ id: 'set-1' }], summaries(0))).toBe(true);
  });

  it('con cartas, o con más de una lotería, ya no lo es', () => {
    expect(isNewAccount([{ id: 'set-1' }], summaries(3))).toBe(false);
    expect(isNewAccount([{ id: 'set-1' }, { id: 'set-2' }], summaries(0))).toBe(false);
  });

  it('sin el resumen cargado no se asume que es nueva', () => {
    expect(isNewAccount([{ id: 'set-1' }], null)).toBe(false);
    expect(isNewAccount([{ id: 'set-1' }], new Map())).toBe(false);
  });
});

describe('textos de «Mis loterías»', () => {
  const keysOf = (value: Record<string, unknown>): string[] => Object.keys(value).sort();

  it('son los mismos en español y en inglés', () => {
    expect(keysOf(en.dashboard.loterias)).toEqual(keysOf(es.dashboard.loterias));
  });
});
