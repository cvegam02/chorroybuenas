import { describe, expect, it } from 'vitest';
import {
  EMPTY_BUILD,
  boardsFromIndexes,
  boardsToIndexes,
  cardCountMessage,
  cardProgress,
  offRatioNotice,
  coverIndex,
  readBuild,
  sampleIndexes,
  setCoverCard,
  toggleSample,
} from '../../src/utils/seasonalBuild';

const card = (path: string, offRatio = false) => ({ path, fileName: `${path}.png`, offRatio });

describe('readBuild', () => {
  it('sin registro, sin cartas', () => {
    expect(readBuild(null)).toEqual(EMPTY_BUILD);
  });

  it('lee cartas, tableros y si el PDF está al día', () => {
    expect(readBuild({ cards: [card('a'), card('b', true)], boards: [[1, 0]], pdf_is_current: true })).toEqual({
      cards: [card('a'), card('b', true)],
      boards: [[1, 0]],
      pdfIsCurrent: true,
    });
  });

  it('descarta tableros que no cuadran con las cartas, y con ellos el PDF', () => {
    const build = readBuild({ cards: [card('a')], boards: [[0, 3]], pdf_is_current: true });
    expect(build.boards).toEqual([]);
    expect(build.pdfIsCurrent).toBe(false);
  });

  it('no confía en cartas mal formadas', () => {
    expect(readBuild({ cards: [{ fileName: 'x' }], boards: [], pdf_is_current: false })).toEqual(EMPTY_BUILD);
    expect(readBuild({ cards: 'x', boards: 'y', pdf_is_current: 'z' })).toEqual(EMPTY_BUILD);
  });
});

describe('boardsToIndexes / boardsFromIndexes', () => {
  it('ida y vuelta', () => {
    const cards = ['a', 'b', 'c'];
    const indexes = boardsToIndexes([['c', 'a'], ['b', 'c']], cards);
    expect(indexes).toEqual([[2, 0], [1, 2]]);
    expect(boardsFromIndexes(indexes, cards)).toEqual([['c', 'a'], ['b', 'c']]);
  });
});

describe('cardCountMessage', () => {
  it('dice si ya alcanza el mínimo del modo', () => {
    expect(cardCountMessage(32, 16)).toBe('Ya puedes seguir: el mínimo en Clásico es 24');
    expect(cardCountMessage(9, 9)).toBe('Ya puedes seguir: el mínimo en Kids es 9');
    expect(cardCountMessage(20, 16)).toBe('Faltan 4 cartas para el mínimo en Clásico, que es 24');
    expect(cardCountMessage(8, 9)).toBe('Falta 1 carta para el mínimo en Kids, que es 9');
  });
});

describe('cardProgress', () => {
  it('va contra 54 y no pasa de lleno', () => {
    expect(cardProgress(27)).toBe(0.5);
    expect(cardProgress(60)).toBe(1);
  });
});

describe('offRatioNotice', () => {
  it('nombra las cartas por su número', () => {
    expect(offRatioNotice([card('a'), card('b')])).toBeNull();
    expect(offRatioNotice([card('a'), card('b', true)])).toBe(
      'La carta 2 no viene en 2:3: se usará completa, con franjas blancas.',
    );
    expect(offRatioNotice([card('a', true), card('b'), card('c', true), card('d', true)])).toBe(
      'Las cartas 1, 3 y 4 no vienen en 2:3: se usarán completas, con franjas blancas.',
    );
  });
});

describe('readBuild con la Vitrina', () => {
  it('conserva portada, muestras y sus copias protegidas, y descarta lo demás', () => {
    const build = readBuild({
      cards: [
        { ...card('a'), role: 'cover', previewPath: 'l/a.jpg' },
        { ...card('b'), role: 'sample' },
        { ...card('c'), role: 'otra', previewPath: '' },
      ],
      boards: [],
      pdf_is_current: false,
    });
    expect(build.cards).toEqual([{ ...card('a'), role: 'cover', previewPath: 'l/a.jpg' }, { ...card('b'), role: 'sample' }, card('c')]);
  });
});

describe('Vitrina', () => {
  const cards = [card('a'), { ...card('b'), role: 'sample' as const }, card('c')];

  it('la portada es la primera si no hay otra', () => {
    expect(coverIndex(cards, false)).toBe(0);
    expect(coverIndex(cards, true)).toBeNull();
    expect(coverIndex([], false)).toBeNull();
    expect(coverIndex([card('a'), { ...card('b'), role: 'cover' as const }], false)).toBe(1);
  });

  it('marca y desmarca muestras, sin tocar la portada', () => {
    expect(sampleIndexes(toggleSample(cards, 2, 0), 0)).toEqual([1, 2]);
    expect(sampleIndexes(toggleSample(cards, 1, 0), 0)).toEqual([]);
    expect(toggleSample(cards, 0, 0)).toEqual(cards);
  });

  it('usar de portada quita la anterior y deja de ser muestra', () => {
    const next = setCoverCard(cards, 1);
    expect(coverIndex(next, false)).toBe(1);
    expect(sampleIndexes(next, 1)).toEqual([]);
    const again = setCoverCard(next, 2);
    expect(again.map((item) => item.role)).toEqual([undefined, undefined, 'cover']);
  });

  it('una portada subida aparte quita la de las cartas', () => {
    const next = setCoverCard(setCoverCard(cards, 2), null);
    expect(coverIndex(next, true)).toBeNull();
    expect(next[2].role).toBeUndefined();
  });
});
