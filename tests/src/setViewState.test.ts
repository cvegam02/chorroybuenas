import { describe, expect, it } from 'vitest';
import es from '../../src/locales/es/translation.json';
import en from '../../src/locales/en/translation.json';
import { minCardsForGrid } from '../../src/utils/gridRules';
import { missingCardNumbers, setViewStateOf } from '../../src/components/SetView/setViewState';

describe('estado de la página de una lotería (FEAT-36, US A1)', () => {
  it('con tableros, está lista para imprimir', () => {
    expect(setViewStateOf({ cardCount: minCardsForGrid(16), boardCount: 12, gridSize: 16 })).toEqual({ kind: 'ready' });
  });

  it('con tableros sigue lista aunque después se le hayan quitado cartas', () => {
    expect(setViewStateOf({ cardCount: 3, boardCount: 1, gridSize: 16 })).toEqual({ kind: 'ready' });
  });

  it('con cartas suficientes y sin tableros, le faltan los tableros', () => {
    expect(setViewStateOf({ cardCount: minCardsForGrid(16), boardCount: 0, gridSize: 16 })).toEqual({
      kind: 'missingBoards',
    });
    expect(setViewStateOf({ cardCount: minCardsForGrid(9) + 4, boardCount: 0, gridSize: 9 })).toEqual({
      kind: 'missingBoards',
    });
  });

  it('por debajo del mínimo de su modo dice cuántas cartas faltan y cuál es el mínimo', () => {
    expect(setViewStateOf({ cardCount: 6, boardCount: 0, gridSize: 9 })).toEqual({
      kind: 'missingCards',
      missing: minCardsForGrid(9) - 6,
      min: minCardsForGrid(9),
    });
  });

  it('el mínimo es el de cada modo: las mismas cartas alcanzan en Niños y no en Clásico', () => {
    const cardCount = minCardsForGrid(9);
    expect(setViewStateOf({ cardCount, boardCount: 0, gridSize: 9 }).kind).toBe('missingBoards');
    expect(setViewStateOf({ cardCount, boardCount: 0, gridSize: 16 }).kind).toBe('missingCards');
  });

  it('sin ninguna carta, le faltan todas las del mínimo', () => {
    expect(setViewStateOf({ cardCount: 0, boardCount: 0, gridSize: 16 })).toEqual({
      kind: 'missingCards',
      missing: minCardsForGrid(16),
      min: minCardsForGrid(16),
    });
  });
});

describe('textos del encabezado y del aviso de estado (FEAT-36, US A1)', () => {
  const keys = [
    'backToLoterias',
    'addPhotos',
    'boards_one',
    'boards_other',
    'howToPlay',
    'readyText_one',
    'readyText_other',
    'missingBoardsTitle',
    'missingBoardsText',
    'buildBoards',
    'missingCardsTitle_one',
    'missingCardsTitle_other',
    'cardsProgress',
    'cardsProgressLabel',
    'minCardsHint',
  ] as const;

  it.each(keys)('«%s» existe en español y en inglés', (key) => {
    expect((es.setView as Record<string, string>)[key]).toBeTruthy();
    expect((en.setView as Record<string, string>)[key]).toBeTruthy();
  });

  it('el aviso de cartas mínimas no trae números escritos: salen de minCardsForGrid', () => {
    for (const locale of [es, en]) {
      const hint = (locale.setView as Record<string, string>).minCardsHint;
      expect(hint).toContain('{{kids}}');
      expect(hint).toContain('{{classic}}');
      expect(hint).not.toMatch(/15|24/);
    }
  });
});

describe('espacios de las cartas que faltan (FEAT-36, US A2)', () => {
  it('hay uno por cada carta que falta, numerados desde la siguiente', () => {
    const state = setViewStateOf({ cardCount: 6, boardCount: 0, gridSize: 9 });
    const numbers = missingCardNumbers(state, 6);
    expect(numbers).toHaveLength(minCardsForGrid(9) - 6);
    expect(numbers[0]).toBe(7);
    expect(numbers[numbers.length - 1]).toBe(minCardsForGrid(9));
  });

  it('sin ninguna carta, van del 1 al mínimo', () => {
    const state = setViewStateOf({ cardCount: 0, boardCount: 0, gridSize: 16 });
    const numbers = missingCardNumbers(state, 0);
    expect(numbers[0]).toBe(1);
    expect(numbers).toHaveLength(minCardsForGrid(16));
  });

  it('con cartas suficientes o con tableros no hay espacios', () => {
    const enough = minCardsForGrid(16);
    expect(missingCardNumbers(setViewStateOf({ cardCount: enough, boardCount: 0, gridSize: 16 }), enough)).toEqual([]);
    expect(missingCardNumbers(setViewStateOf({ cardCount: 3, boardCount: 2, gridSize: 16 }), 3)).toEqual([]);
  });

  it.each(['cardsCountWithAi', 'aiBadge', 'cardsNote', 'missingCardsNote', 'addCardSlot'])(
    '«%s» existe en español y en inglés',
    (key) => {
      expect((es.setView as Record<string, string>)[key]).toBeTruthy();
      expect((en.setView as Record<string, string>)[key]).toBeTruthy();
    },
  );
});

describe('textos de ver carta grande (FEAT-36, US A3)', () => {
  it.each(['previousCard', 'nextCard', 'cardPosition', 'editThisCard'])('«%s» existe en español y en inglés', (key) => {
    expect((es.setView as Record<string, string>)[key]).toBeTruthy();
    expect((en.setView as Record<string, string>)[key]).toBeTruthy();
  });
});

describe('textos de Tableros y de «Preparando tu PDF…» (FEAT-36, US A4)', () => {
  it.each([
    'boardsNotYet',
    'shuffleBoards',
    'boardsNote',
    'boardsNoteMobile_one',
    'boardsNoteMobile_other',
    'boardsLockedTitle',
    'boardsLockedText',
    'noBoardsTitle',
    'pdfPreparingTitle',
    'pdfPreparingContents',
    'pdfPreparingNote',
  ])('«%s» existe en español y en inglés', (key) => {
    expect((es.setView as Record<string, string>)[key]).toBeTruthy();
    expect((en.setView as Record<string, string>)[key]).toBeTruthy();
  });

  it('el bloque sin tableros no trae el mínimo escrito: sale de minCardsForGrid', () => {
    for (const locale of [es, en]) {
      const title = (locale.setView as Record<string, string>).boardsLockedTitle;
      expect(title).toContain('{{min}}');
      expect(title).not.toMatch(/15|24/);
    }
  });
});

describe('textos del menú y de las confirmaciones (FEAT-36, US A5)', () => {
  it.each([
    'deleteLoteria',
    'shuffleConfirmTitle_one',
    'shuffleConfirmTitle_other',
    'shuffleConfirmText',
    'shuffleConfirmAction',
    'clearConfirmTitle_one',
    'clearConfirmTitle_other',
    'clearConfirmText_one',
    'clearConfirmText_other',
    'clearConfirmAction',
    'clearConfirmCancel',
  ])('«%s» existe en español y en inglés', (key) => {
    expect((es.setView as Record<string, string>)[key]).toBeTruthy();
    expect((en.setView as Record<string, string>)[key]).toBeTruthy();
  });
});

describe('limpieza de textos de la página de una lotería (FEAT-36, US A6)', () => {
  it('español e inglés tienen las mismas claves', () => {
    expect(Object.keys(en.setView).sort()).toEqual(Object.keys(es.setView).sort());
  });

  it.each([
    'backToHome',
    'cardCount',
    'noCards',
    'tokensSpentInSet',
    'boardCount',
    'generateBoards',
    'regeneratePDF',
    'regeneratingPDF',
    'generateNewBoards',
  ])('«%s» ya no existe: ninguna pantalla lo usa', (key) => {
    expect(es.setView).not.toHaveProperty(key);
    expect(en.setView).not.toHaveProperty(key);
  });

  it('se fue el texto de la confirmación anterior de borrar tableros', () => {
    expect(es.modals).not.toHaveProperty('clearBoards');
    expect(en.modals).not.toHaveProperty('clearBoards');
  });
});
