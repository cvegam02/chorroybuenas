import { describe, expect, it } from 'vitest';
import {
  groupCatalog,
  localizedText,
  showsSampleNote,
  type CatalogLoteria,
  type CatalogSeason,
} from '../../src/utils/seasonalCatalog';

const NOW = new Date('2026-10-06T18:00:00.000Z');
const YESTERDAY = '2026-10-05T18:00:00.000Z';
const TOMORROW = '2026-10-07T18:00:00.000Z';

function season(id: string, name_es: string, sort_order: number, name_en: string | null = null): CatalogSeason {
  return { id, name_es, name_en, sort_order };
}

function loteria(id: string, season_id: string, overrides: Partial<CatalogLoteria> = {}): CatalogLoteria {
  return {
    id,
    season_id,
    name_es: id,
    name_en: null,
    description_es: 'Lista',
    description_en: null,
    grid_size: 16,
    card_count: 54,
    board_count: 10,
    price_cents: 4900,
    is_published: true,
    valid_from: null,
    valid_until: null,
    cover_path: `${id}/portada.jpg`,
    sample_paths: [],
    ...overrides,
  };
}

const MUERTOS = season('s-muertos', 'Día de Muertos', 1);
const NAVIDAD = season('s-navidad', 'Navidad', 2, 'Christmas');
const PASCUA = season('s-pascua', 'Pascua', 0);

describe('catálogo de loterías de temporada (FEAT-17, P5)', () => {
  it('agrupa las loterías por temporada, en el orden definido', () => {
    const groups = groupCatalog(
      [NAVIDAD, MUERTOS, PASCUA],
      [loteria('posadas', NAVIDAD.id), loteria('ofrenda', MUERTOS.id), loteria('conejos', PASCUA.id)],
      NOW,
    );
    expect(groups.map((group) => group.season.name_es)).toEqual(['Pascua', 'Día de Muertos', 'Navidad']);
    expect(groups[2].loterias.map((item) => item.id)).toEqual(['posadas']);
  });

  it('a igual orden, las temporadas van por nombre', () => {
    const groups = groupCatalog(
      [season('b', 'Navidad', 1), season('a', 'Halloween', 1)],
      [loteria('x', 'a'), loteria('y', 'b')],
      NOW,
    );
    expect(groups.map((group) => group.season.name_es)).toEqual(['Halloween', 'Navidad']);
  });

  it('una temporada sin loterías visibles no se muestra', () => {
    const groups = groupCatalog(
      [MUERTOS, NAVIDAD, PASCUA],
      [loteria('ofrenda', MUERTOS.id), loteria('borrador', NAVIDAD.id, { is_published: false })],
      NOW,
    );
    expect(groups.map((group) => group.season.name_es)).toEqual(['Día de Muertos']);
  });

  it('solo entran las loterías publicadas y dentro de sus fechas', () => {
    const groups = groupCatalog(
      [MUERTOS],
      [
        loteria('visible', MUERTOS.id, { valid_from: YESTERDAY, valid_until: TOMORROW }),
        loteria('borrador', MUERTOS.id, { is_published: false }),
        loteria('programada', MUERTOS.id, { valid_from: TOMORROW }),
        loteria('vencida', MUERTOS.id, { valid_until: YESTERDAY }),
      ],
      NOW,
    );
    expect(groups[0].loterias.map((item) => item.id)).toEqual(['visible']);
  });

  it('dentro de una temporada, las loterías van por nombre', () => {
    const groups = groupCatalog(
      [MUERTOS],
      [loteria('b', MUERTOS.id, { name_es: 'Ofrenda' }), loteria('a', MUERTOS.id, { name_es: 'Calaveritas' })],
      NOW,
    );
    expect(groups[0].loterias.map((item) => item.name_es)).toEqual(['Calaveritas', 'Ofrenda']);
  });

  it('una lotería de una temporada que no existe se descarta', () => {
    expect(groupCatalog([MUERTOS], [loteria('huérfana', 'otra')], NOW)).toEqual([]);
  });

  it('sin loterías, el catálogo está vacío', () => {
    expect(groupCatalog([MUERTOS, NAVIDAD], [], NOW)).toEqual([]);
  });
});

describe('textos en dos idiomas (FEAT-17, decisión 10)', () => {
  it('en español se usa el español', () => {
    expect(localizedText('Navidad', 'Christmas', 'es')).toBe('Navidad');
    expect(localizedText('Navidad', 'Christmas', 'es-MX')).toBe('Navidad');
  });

  it('en inglés se usa el inglés si existe', () => {
    expect(localizedText('Navidad', 'Christmas', 'en')).toBe('Christmas');
    expect(localizedText('Navidad', 'Christmas', 'en-US')).toBe('Christmas');
  });

  it('en inglés sin traducción se muestra el español', () => {
    expect(localizedText('Navidad', null, 'en')).toBe('Navidad');
    expect(localizedText('Navidad', '   ', 'en')).toBe('Navidad');
  });

  it('un texto que no existe en ningún idioma queda vacío', () => {
    expect(localizedText(null, null, 'en')).toBe('');
  });
});

describe('showsSampleNote', () => {
  it('avisa cuando las muestras son menos que las cartas', () => {
    expect(showsSampleNote(6, 54)).toBe(true);
  });

  it('no avisa cuando se muestran todas las cartas', () => {
    expect(showsSampleNote(54, 54)).toBe(false);
  });

  it('no avisa cuando no hay muestras', () => {
    expect(showsSampleNote(0, 54)).toBe(false);
  });

  it('no avisa cuando no se sabe cuántas cartas tiene', () => {
    expect(showsSampleNote(6, null)).toBe(false);
  });
});

describe('forma del catálogo rediseñado (FEAT-33, US A3)', () => {
  it('una temática con una sola lotería se muestra como tarjeta grande', async () => {
    const { catalogLayout } = await import('../../src/utils/seasonalCatalog');
    expect(catalogLayout(1)).toBe('feature');
  });

  it('con varias loterías se muestra como cuadrícula', async () => {
    const { catalogLayout } = await import('../../src/utils/seasonalCatalog');
    expect(catalogLayout(2)).toBe('grid');
    expect(catalogLayout(5)).toBe('grid');
  });
});
