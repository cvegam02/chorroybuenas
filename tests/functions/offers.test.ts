import { describe, expect, it } from 'vitest';
import { applyOfferDiscount, selectCurrentOffer, type OfferRow } from '../../supabase/functions/_shared/offers.ts';

describe('applyOfferDiscount', () => {
  it.each([
    [200, 25, 150], // cantidad libre: $2.00 → $1.50 por token
    [2000, 25, 1500], // Pack 10
    [4000, 25, 3000], // Pack 20
    [10000, 25, 7500], // Pack 50
    [1999, 25, 1499], // 1499.25 → 1499
    [1998, 25, 1499], // 1498.5 → 1499 (medio centavo sube)
    [199, 10, 179], // 179.1 → 179
    [200, 99, 2],
  ])('%i centavos con %i%% de descuento → %i', (cents, percent, expected) => {
    expect(applyOfferDiscount(cents, percent)).toBe(expected);
  });
});

describe('selectCurrentOffer', () => {
  const now = new Date('2026-11-15T12:00:00Z');
  const offer = (over: Partial<OfferRow> = {}): OfferRow => ({
    id: 'offer-1',
    discount_percent: 25,
    starts_at: '2026-11-13T07:00:00Z',
    ends_at: '2026-11-18T06:59:59Z',
    cancelled_at: null,
    ...over,
  });

  it('devuelve la oferta vigente', () => {
    expect(selectCurrentOffer([offer()], now)).toEqual({ id: 'offer-1', percent: 25 });
  });

  it('sin ofertas no hay descuento', () => {
    expect(selectCurrentOffer([], now)).toBe(null);
  });

  it('una programada no descuenta', () => {
    expect(selectCurrentOffer([offer({ starts_at: '2026-11-16T00:00:00Z' })], now)).toBe(null);
  });

  it('una terminada no descuenta', () => {
    expect(selectCurrentOffer([offer({ ends_at: '2026-11-15T11:59:59Z' })], now)).toBe(null);
  });

  it('una cancelada no descuenta', () => {
    expect(selectCurrentOffer([offer({ cancelled_at: '2026-11-14T00:00:00Z' })], now)).toBe(null);
  });

  it('empieza justo en su inicio y termina justo en su fin', () => {
    expect(selectCurrentOffer([offer({ starts_at: now.toISOString() })], now)).not.toBe(null);
    expect(selectCurrentOffer([offer({ ends_at: now.toISOString() })], now)).toBe(null);
  });

  it('ignora filas con un descuento inválido', () => {
    expect(selectCurrentOffer([offer({ discount_percent: 0 })], now)).toBe(null);
    expect(selectCurrentOffer([offer({ discount_percent: 100 })], now)).toBe(null);
    expect(selectCurrentOffer([offer({ discount_percent: 12.5 })], now)).toBe(null);
  });

  it('elige la vigente entre varias', () => {
    const rows = [
      offer({ id: 'vieja', ends_at: '2026-11-01T00:00:00Z', starts_at: '2026-10-25T00:00:00Z' }),
      offer({ id: 'vigente', discount_percent: 20 }),
    ];
    expect(selectCurrentOffer(rows, now)).toEqual({ id: 'vigente', percent: 20 });
  });
});
