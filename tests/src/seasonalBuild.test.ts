import { describe, expect, it } from 'vitest';
import { placeImageInCard } from '../../src/services/pdf/layout';
import { seasonalPdfFileName, withBuiltCounts } from '../../src/utils/seasonalLoteria';

describe('imagen de una carta dentro de su casilla del PDF', () => {
  const cell = { width: 96, height: 145.6 };

  it('una carta terminada (FEAT-23) cabe entera en la casilla, sin recortarse', () => {
    for (const [imgWidth, imgHeight] of [[1000, 1500], [1000, 1000], [1500, 1000]]) {
      const placed = placeImageInCard(imgWidth, imgHeight, cell.width, cell.height, 0, 'contain');
      expect(placed.width).toBeLessThanOrEqual(cell.width + 0.001);
      expect(placed.height).toBeLessThanOrEqual(cell.height + 0.001);
      expect(placed.offsetX).toBeGreaterThanOrEqual(-0.001);
      expect(placed.offsetY).toBeGreaterThanOrEqual(-0.001);
      expect(placed.width / placed.height).toBeCloseTo(imgWidth / imgHeight, 3);
    }
  });

  it('una carta terminada queda centrada', () => {
    const placed = placeImageInCard(1000, 1500, cell.width, cell.height, 0, 'contain');
    expect(placed.offsetX).toBeCloseTo((cell.width - placed.width) / 2);
    expect(placed.offsetY).toBeCloseTo((cell.height - placed.height) / 2);
  });

  it('la carta normal sigue llenando la casilla por encima del espacio del título', () => {
    const titleSpace = 19;
    const placed = placeImageInCard(512, 768, cell.width, cell.height, titleSpace, 'cover');
    expect(placed.width).toBeGreaterThanOrEqual(cell.width - 0.001);
    expect(placed.height).toBeGreaterThanOrEqual(cell.height - titleSpace - 0.001);
    expect(placed.offsetY + placed.height / 2).toBeCloseTo(titleSpace + (cell.height - titleSpace) / 2);
  });
});

describe('ficha después de armar el PDF en el sitio (FEAT-23, decisión 6)', () => {
  const loteria = {
    id: 'lot-1',
    is_published: true,
    cover_path: 'lot-1/portada.jpg',
    sample_paths: ['lot-1/a.jpg'],
    pdf: null,
    season_id: 'temp-1',
    name_es: 'Halloween 2026',
    name_en: null,
    description_es: 'Lotería de Halloween',
    description_en: null,
    grid_size: 16 as const,
    card_count: 40,
    board_count: 5,
    price_cents: 4900,
    valid_from: null,
    valid_until: '2026-11-02T06:00:00.000Z',
  };

  it('el número de cartas y de tableros es el de lo generado', () => {
    const input = withBuiltCounts(loteria, 54, 27);
    expect(input.card_count).toBe(54);
    expect(input.board_count).toBe(27);
  });

  it('el resto de la ficha no cambia y no se cuelan campos que no se guardan', () => {
    const input = withBuiltCounts(loteria, 54, 27);
    expect(input).toEqual({
      season_id: 'temp-1',
      name_es: 'Halloween 2026',
      name_en: null,
      description_es: 'Lotería de Halloween',
      description_en: null,
      grid_size: 16,
      card_count: 54,
      board_count: 27,
      price_cents: 4900,
      valid_from: null,
      valid_until: '2026-11-02T06:00:00.000Z',
    });
    expect(loteria.card_count).toBe(40);
  });

  it('el archivo se llama como la lotería, sin caracteres raros', () => {
    expect(seasonalPdfFileName('Halloween 2026')).toBe('halloween-2026.pdf');
    expect(seasonalPdfFileName('  Día de Muertos: ¡edición niños!  ')).toBe('dia-de-muertos-edicion-ninos.pdf');
    expect(seasonalPdfFileName('///')).toBe('loteria-de-temporada.pdf');
  });
});
