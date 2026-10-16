import { describe, expect, it } from 'vitest';
import { applyOfferDiscount } from '../../supabase/functions/_shared/offers';
import {
  durationLabel,
  endsAtIso,
  offerCardSummary,
  offerDiscountCents,
  offerHeaderStatus,
  offerPriceRows,
  offerStatus,
  overlappingOffer,
  startsAtIso,
  datetimeInputFromIso,
  validateOfferForm,
} from '../../src/utils/adminOffers';

const NOW = new Date('2026-10-15T18:00:00Z'); // 15 oct, 11:00 en Hermosillo
const HOUR = 3_600_000;
const DAY = 24 * HOUR;

const buenFin = {
  id: 'o1',
  name: 'Buen Fin 2026',
  discount_percent: 25,
  starts_at: '2026-11-13T00:00:00-07:00',
  ends_at: '2026-11-17T23:59:59-07:00',
  cancelled_at: null,
};

describe('offerDiscountCents', () => {
  it('calcula igual que el servidor', () => {
    for (let cents = 1; cents <= 12000; cents += 7) {
      for (const percent of [1, 5, 10, 15, 25, 33, 50, 75, 99]) {
        expect(offerDiscountCents(cents, percent)).toBe(applyOfferDiscount(cents, percent));
      }
    }
  });
});

describe('offerStatus', () => {
  it('programada, vigente, terminada y cancelada', () => {
    expect(offerStatus(buenFin, NOW)).toBe('scheduled');
    expect(offerStatus(buenFin, new Date('2026-11-15T18:00:00Z'))).toBe('current');
    expect(offerStatus(buenFin, new Date('2026-11-18T07:00:00Z'))).toBe('ended');
    expect(offerStatus({ ...buenFin, cancelled_at: '2026-10-20T00:00:00Z' }, NOW)).toBe('cancelled');
  });

  it('empieza justo en su inicio y termina justo en su fin', () => {
    expect(offerStatus(buenFin, new Date(buenFin.starts_at))).toBe('current');
    expect(offerStatus(buenFin, new Date(buenFin.ends_at))).toBe('ended');
  });
});

describe('durationLabel', () => {
  it.each([
    [29 * DAY + 3 * HOUR, false, '29 días'],
    [2 * DAY + 5 * HOUR + 59 * 60_000, true, '2 días 5 h'],
    [1 * DAY, true, '1 día'],
    [1 * DAY + 1 * HOUR, true, '1 día 1 h'],
    [5 * HOUR + 30 * 60_000, true, '5 h'],
    [5 * HOUR, false, '5 h'],
    [45 * 60_000, true, '45 min'],
    [20_000, true, '1 min'],
  ])('%i ms (con horas: %s) → %s', (ms, withHours, expected) => {
    expect(durationLabel(ms, withHours)).toBe(expected);
  });
});

describe('offerHeaderStatus', () => {
  it('como la maqueta: «Programada · empieza en 29 días»', () => {
    expect(offerHeaderStatus(buenFin, new Date('2026-10-15T07:00:00Z'))).toBe('Programada · empieza en 29 días');
  });

  it('vigente con lo que le falta, terminada y cancelada', () => {
    expect(offerHeaderStatus(buenFin, new Date('2026-11-15T18:00:00Z'))).toBe('Vigente · termina en 2 días 12 h');
    expect(offerHeaderStatus(buenFin, new Date('2026-12-01T00:00:00Z'))).toBe('Terminada');
    expect(offerHeaderStatus({ ...buenFin, cancelled_at: '2026-10-20T00:00:00Z' }, NOW)).toBe('Cancelada');
  });
});

describe('offerPriceRows', () => {
  const packs = [
    { id: 'p10', base_tokens: 10, bonus_tokens: 2, price_cents: 2000 },
    { id: 'p20', base_tokens: 20, bonus_tokens: 5, price_cents: 4000 },
    { id: 'p50', base_tokens: 50, bonus_tokens: 20, price_cents: 10000 },
  ];

  it('la tabla de la maqueta con 25%', () => {
    expect(offerPriceRows(200, packs, 25)).toEqual([
      { key: 'custom', label: 'Cantidad libre', bonus: '', normal: '$2.00 c/u', offer: '$1.50 c/u', perToken: '$1.50' },
      { key: 'p10', label: 'Pack 10', bonus: '(+2)', normal: '$20', offer: '$15', perToken: '$1.25' },
      { key: 'p20', label: 'Pack 20', bonus: '(+5)', normal: '$40', offer: '$30', perToken: '$1.20' },
      { key: 'p50', label: 'Pack 50', bonus: '(+20)', normal: '$100', offer: '$75', perToken: '$1.07' },
    ]);
  });

  it('con centavos y sin regalo', () => {
    expect(offerPriceRows(199, [{ id: 'p7', base_tokens: 7, bonus_tokens: 0, price_cents: 1999 }], 10)).toEqual([
      { key: 'custom', label: 'Cantidad libre', bonus: '', normal: '$1.99 c/u', offer: '$1.79 c/u', perToken: '$1.79' },
      { key: 'p7', label: 'Pack 7', bonus: '', normal: '$19.99', offer: '$17.99', perToken: '$2.57' },
    ]);
  });

  it('sin precio por token conocido, solo los packs', () => {
    expect(offerPriceRows(null, packs.slice(0, 1), 25).map((r) => r.key)).toEqual(['p10']);
  });

  it('sin descuento válido todavía, la columna de oferta queda en blanco', () => {
    expect(offerPriceRows(200, packs.slice(0, 1), null)[1]).toMatchObject({ offer: '—', perToken: '$1.67' });
  });
});

describe('offerCardSummary', () => {
  it('como la maqueta: «13 – 17 nov · tokens a $1.50»', () => {
    expect(offerCardSummary(buenFin, 200, NOW)).toBe('13 – 17 nov · tokens a $1.50');
  });

  it('entre meses y de otro año', () => {
    expect(offerCardSummary({ ...buenFin, starts_at: '2026-11-28T00:00:00-07:00', ends_at: '2026-12-02T23:59:59-07:00' }, 200, NOW))
      .toBe('28 nov – 2 dic · tokens a $1.50');
    expect(offerCardSummary({ ...buenFin, starts_at: '2027-01-05T00:00:00-07:00', ends_at: '2027-01-06T23:59:59-07:00' }, null, NOW))
      .toBe('5 – 6 ene 2027');
  });
});

describe('fechas del formulario (hora de Hermosillo)', () => {
  it('Desde empieza en el minuto escrito; Hasta incluye todo ese minuto', () => {
    expect(startsAtIso('2026-11-13T00:00')).toBe('2026-11-13T00:00:00-07:00');
    expect(endsAtIso('2026-11-17T23:59')).toBe('2026-11-17T23:59:59-07:00');
    expect(startsAtIso('')).toBe(null);
    expect(endsAtIso('')).toBe(null);
  });

  it('lo guardado regresa al campo en hora de Hermosillo', () => {
    expect(datetimeInputFromIso('2026-11-13T07:00:00Z')).toBe('2026-11-13T00:00');
    expect(datetimeInputFromIso('2026-11-18T06:59:59Z')).toBe('2026-11-17T23:59');
    expect(datetimeInputFromIso(null)).toBe('');
  });
});

describe('validateOfferForm', () => {
  const form = { name: ' Buen Fin 2026 ', percent: '25', startsAt: '2026-11-13T00:00', endsAt: '2026-11-17T23:59' };

  it('acepta la oferta de la maqueta', () => {
    expect(validateOfferForm(form)).toEqual({
      ok: true,
      value: { name: 'Buen Fin 2026', discount_percent: 25, starts_at: '2026-11-13T00:00:00-07:00', ends_at: '2026-11-17T23:59:59-07:00' },
    });
  });

  it.each([
    ['sin nombre', { name: '  ' }, 'name', 'Escribe un nombre interno.'],
    ['nombre largo', { name: 'x'.repeat(81) }, 'name', 'El nombre puede tener hasta 80 caracteres.'],
    ['descuento vacío', { percent: '' }, 'percent', 'El descuento va de 1% a 99%, sin decimales.'],
    ['descuento 0', { percent: '0' }, 'percent', 'El descuento va de 1% a 99%, sin decimales.'],
    ['descuento 100', { percent: '100' }, 'percent', 'El descuento va de 1% a 99%, sin decimales.'],
    ['descuento con decimales', { percent: '12.5' }, 'percent', 'El descuento va de 1% a 99%, sin decimales.'],
    ['sin inicio', { startsAt: '' }, 'startsAt', 'Elige cuándo empieza.'],
    ['sin fin', { endsAt: '' }, 'endsAt', 'Elige cuándo termina.'],
    ['fin antes del inicio', { endsAt: '2026-11-12T23:59' }, 'endsAt', 'Tiene que terminar después de empezar.'],
  ])('rechaza: %s', (_name, over, field, message) => {
    const r = validateOfferForm({ ...form, ...over });
    expect(r.ok).toBe(false);
    expect(!r.ok && r.errors[field as keyof typeof r.errors]).toBe(message);
  });
});

describe('overlappingOffer', () => {
  const others = [
    buenFin,
    { ...buenFin, id: 'o2', name: 'Cancelada', starts_at: '2026-12-01T00:00:00-07:00', ends_at: '2026-12-05T23:59:59-07:00', cancelled_at: '2026-10-01T00:00:00Z' },
  ];

  it('avisa con cuál se cruza', () => {
    expect(overlappingOffer(others, '2026-11-17T00:00:00-07:00', '2026-11-20T00:00:00-07:00', null)?.name).toBe('Buen Fin 2026');
  });

  it('una que empieza justo al terminar otra no se cruza', () => {
    expect(overlappingOffer(others, '2026-11-17T23:59:59-07:00', '2026-11-20T00:00:00-07:00', null)).toBe(null);
  });

  it('no cuenta las canceladas ni a sí misma', () => {
    expect(overlappingOffer(others, '2026-12-02T00:00:00-07:00', '2026-12-03T00:00:00-07:00', null)).toBe(null);
    expect(overlappingOffer(others, '2026-11-14T00:00:00-07:00', '2026-11-16T00:00:00-07:00', 'o1')).toBe(null);
  });
});
