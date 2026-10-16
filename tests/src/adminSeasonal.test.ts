import { describe, expect, it } from 'vitest';
import {
  loteriaCardState,
  loteriaDetailLine,
  loteriaNoteLine,
  seasonalOverviewLine,
  themeChips,
  type LoteriaCardInput,
} from '../../src/utils/adminSeasonal';

const NOW = new Date('2026-10-15T18:00:00Z');

const complete: LoteriaCardInput = {
  season_id: 's1',
  name_es: 'Calaveritas',
  description_es: 'Para jugar en Día de Muertos',
  grid_size: 16,
  card_count: 54,
  board_count: 20,
  price_cents: 10000,
  is_published: false,
  valid_from: null,
  valid_until: null,
  cover_path: 'c.jpg',
  pdf: { path: 'p.pdf', name: 'p.pdf', sizeBytes: 1 },
};

describe('loteriaCardState', () => {
  it('distingue los cinco estados', () => {
    expect(loteriaCardState({ ...complete, is_published: true }, NOW)).toBe('published');
    expect(loteriaCardState({ ...complete, is_published: true, valid_from: '2026-12-01T07:00:00Z' }, NOW)).toBe(
      'scheduled',
    );
    expect(loteriaCardState({ ...complete, is_published: true, valid_until: '2026-10-01T07:00:00Z' }, NOW)).toBe(
      'expired',
    );
    expect(loteriaCardState(complete, NOW)).toBe('ready');
    expect(loteriaCardState({ ...complete, price_cents: null }, NOW)).toBe('incomplete');
  });
});

describe('loteriaDetailLine', () => {
  it('dice modo, cartas y tableros, y omite lo que no tiene', () => {
    expect(loteriaDetailLine(complete)).toBe('Clásico · 54 cartas · 20 tableros');
    expect(loteriaDetailLine({ ...complete, grid_size: 9, card_count: 9, board_count: null })).toBe('Kids · 9 cartas');
    expect(loteriaDetailLine({ ...complete, card_count: 1, board_count: 1 })).toBe('Clásico · 1 carta · 1 tablero');
  });
});

describe('loteriaNoteLine', () => {
  it('a un borrador incompleto le dice qué le falta', () => {
    const line = loteriaNoteLine({ ...complete, board_count: null, cover_path: null, price_cents: null }, NOW);
    expect(line).toEqual({ text: 'Faltan: tableros, precio y portada', danger: true });
    expect(loteriaNoteLine({ ...complete, pdf: null }, NOW)).toEqual({ text: 'Falta: PDF', danger: true });
  });

  it('a una programada le dice desde cuándo se ve', () => {
    expect(
      loteriaNoteLine({ ...complete, is_published: true, valid_from: '2026-12-01T19:00:00Z' }, NOW),
    ).toEqual({ text: 'Visible desde el 1 dic', danger: false });
    expect(
      loteriaNoteLine({ ...complete, is_published: true, valid_from: '2027-01-05T19:00:00Z' }, NOW)?.text,
    ).toBe('Visible desde el 5 ene 2027');
  });

  it('a las demás no les pone nada', () => {
    expect(loteriaNoteLine({ ...complete, is_published: true }, NOW)).toBeNull();
    expect(loteriaNoteLine(complete, NOW)).toBeNull();
  });
});

describe('seasonalOverviewLine', () => {
  it('cuenta loterías, las visibles hoy y lo vendido', () => {
    const loterias = [
      { ...complete, is_published: true },
      { ...complete, is_published: true, valid_from: '2026-12-01T07:00:00Z' },
      { ...complete, is_published: true, valid_until: '2026-10-01T07:00:00Z' },
      complete,
    ];
    expect(seasonalOverviewLine(loterias, 130000, NOW)).toBe('4 loterías · 1 publicada · $1,300 vendidos este mes');
    expect(seasonalOverviewLine([complete], 3550, NOW)).toBe('1 lotería · 0 publicadas · $35.50 vendidos este mes');
  });
});

describe('themeChips', () => {
  it('pone Todas y una por temática, en su orden, con su número de loterías', () => {
    const seasons = [
      { id: 's2', name_es: 'Navidad' },
      { id: 's1', name_es: 'Día de Muertos' },
    ];
    const loterias = [{ season_id: 's1' }, { season_id: 's1' }, { season_id: 's2' }];
    expect(themeChips(seasons, loterias)).toEqual([
      { id: '', label: 'Todas', count: 3 },
      { id: 's2', label: 'Navidad', count: 1 },
      { id: 's1', label: 'Día de Muertos', count: 2 },
    ]);
  });
});
