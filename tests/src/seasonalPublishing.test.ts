import { describe, expect, it } from 'vitest';
import {
  isoToLocalInput,
  localInputToIso,
  missingToPublish,
  seasonalStatus,
  type PublishableLoteria,
} from '../../src/utils/seasonalPublishing';

const NOW = new Date('2026-10-06T18:00:00.000Z');
const BEFORE = '2026-10-05T18:00:00.000Z';
const AFTER = '2026-10-07T18:00:00.000Z';

function status(is_published: boolean, valid_from: string | null, valid_until: string | null) {
  return seasonalStatus({ is_published, valid_from, valid_until }, NOW);
}

describe('estado de una lotería de temporada (FEAT-17, decisión 5)', () => {
  it('sin publicar es un borrador, tenga o no fechas', () => {
    expect(status(false, null, null)).toBe('draft');
    expect(status(false, AFTER, null)).toBe('draft');
    expect(status(false, null, BEFORE)).toBe('draft');
  });

  it('publicada y sin fechas está publicada', () => {
    expect(status(true, null, null)).toBe('published');
  });

  it('publicada dentro de sus fechas está publicada', () => {
    expect(status(true, BEFORE, AFTER)).toBe('published');
    expect(status(true, BEFORE, null)).toBe('published');
    expect(status(true, null, AFTER)).toBe('published');
  });

  it('publicada con inicio a futuro está programada', () => {
    expect(status(true, AFTER, null)).toBe('scheduled');
  });

  it('publicada con el fin ya pasado está fuera de fechas', () => {
    expect(status(true, null, BEFORE)).toBe('expired');
    expect(status(true, '2026-10-01T00:00:00.000Z', BEFORE)).toBe('expired');
  });

  it('en el instante de inicio ya está publicada', () => {
    expect(status(true, NOW.toISOString(), null)).toBe('published');
  });

  it('en el instante de fin ya está fuera de fechas', () => {
    expect(status(true, null, NOW.toISOString())).toBe('expired');
  });

  it('un milisegundo antes del inicio sigue programada; uno antes del fin sigue publicada', () => {
    expect(status(true, new Date(NOW.getTime() + 1).toISOString(), null)).toBe('scheduled');
    expect(status(true, null, new Date(NOW.getTime() + 1).toISOString())).toBe('published');
  });
});

const COMPLETE: PublishableLoteria = {
  name_es: 'Posadas',
  description_es: 'Lotería navideña',
  price_cents: 4900,
  hasPdf: true,
  hasCover: true,
};

describe('qué falta para publicar (FEAT-17, decisión 25)', () => {
  it('a una lotería completa no le falta nada', () => {
    expect(missingToPublish(COMPLETE)).toEqual([]);
  });

  it('señala cada cosa que falta', () => {
    expect(missingToPublish({ ...COMPLETE, name_es: '  ' })).toEqual(['nombre']);
    expect(missingToPublish({ ...COMPLETE, description_es: null })).toEqual(['descripción']);
    expect(missingToPublish({ ...COMPLETE, description_es: '   ' })).toEqual(['descripción']);
    expect(missingToPublish({ ...COMPLETE, price_cents: null })).toEqual(['precio']);
    expect(missingToPublish({ ...COMPLETE, hasPdf: false })).toEqual(['PDF']);
    expect(missingToPublish({ ...COMPLETE, hasCover: false })).toEqual(['portada']);
  });

  it('lista todo lo que falta, en el orden del formulario', () => {
    expect(
      missingToPublish({ name_es: '', description_es: null, price_cents: null, hasPdf: false, hasCover: false }),
    ).toEqual(['nombre', 'descripción', 'precio', 'PDF', 'portada']);
  });
});

describe('fechas del formulario', () => {
  it('una fecha vacía es «sin fecha»', () => {
    expect(localInputToIso('')).toBeNull();
    expect(localInputToIso('   ')).toBeNull();
    expect(isoToLocalInput(null)).toBe('');
  });

  it('lo que no es una fecha no se convierte', () => {
    expect(localInputToIso('mañana')).toBeUndefined();
  });

  it('lo que se escribe es lo que se vuelve a ver al editar', () => {
    const iso = localInputToIso('2026-10-31T08:30');
    expect(iso).toBe(new Date(2026, 9, 31, 8, 30).toISOString());
    expect(isoToLocalInput(iso ?? null)).toBe('2026-10-31T08:30');
  });
});
