import { describe, expect, it } from 'vitest';
import { MIN_PURCHASE_CENTS as SERVER_MIN } from '../../supabase/functions/_shared/preference.ts';
import {
  MIN_PURCHASE_CENTS, minCustomTokens, offerMinimumError, packMinimumError,
} from '../../src/utils/purchaseRules';
import { pendingOfferPercent } from '../../src/utils/adminOffers';

describe('mínimo de compra en pesos (FEAT-58, decisión 2)', () => {
  it('es el mismo que el del servidor', () => {
    expect(MIN_PURCHASE_CENTS).toBe(SERVER_MIN);
  });

  it('la cantidad libre sube su mínimo para llegar a $10', () => {
    expect(minCustomTokens(200)).toBe(5);
    expect(minCustomTokens(100)).toBe(10);
    expect(minCustomTokens(150)).toBe(7);
    expect(minCustomTokens(300)).toBe(5);
  });

  it('una oferta que deja un pack activo por debajo de $10 no se guarda, y dice cuál', () => {
    const packs = [
      { base_tokens: 10, price_cents: 2000, is_active: true },
      { base_tokens: 50, price_cents: 10000, is_active: true },
    ];
    expect(offerMinimumError(packs, 50)).toBeNull();
    expect(offerMinimumError(packs, 60)).toBe(
      'Con −60%, el pack de 10 tokens quedaría en $8.00, por debajo del mínimo de compra de $10.00.',
    );
  });

  it('los packs apagados no cuentan', () => {
    expect(offerMinimumError([{ base_tokens: 10, price_cents: 2000, is_active: false }], 90)).toBeNull();
  });

  it('un pack no se guarda por debajo de $10, ni con la oferta vigente o programada', () => {
    expect(packMinimumError(2000, null)).toBeNull();
    expect(packMinimumError(900, null)).toBe('El precio mínimo de un pack es $10.00.');
    expect(packMinimumError(2000, 60)).toBe(
      'Con la oferta de −60%, este pack quedaría en $8.00, por debajo del mínimo de compra de $10.00.',
    );
  });

  it('la oferta que cuenta para los packs es la vigente o programada con más descuento', () => {
    const now = new Date('2026-10-26T12:00:00Z');
    const offer = (percent: number, starts: string, ends: string, cancelled: string | null = null) => ({
      discount_percent: percent, starts_at: starts, ends_at: ends, cancelled_at: cancelled,
    });
    expect(pendingOfferPercent([], now)).toBeNull();
    expect(pendingOfferPercent([
      offer(20, '2026-10-20T00:00:00Z', '2026-10-30T00:00:00Z'),
      offer(40, '2026-11-01T00:00:00Z', '2026-11-05T00:00:00Z'),
      offer(70, '2026-10-01T00:00:00Z', '2026-10-05T00:00:00Z'),
      offer(80, '2026-11-01T00:00:00Z', '2026-11-05T00:00:00Z', '2026-10-25T00:00:00Z'),
    ], now)).toBe(40);
  });
});
