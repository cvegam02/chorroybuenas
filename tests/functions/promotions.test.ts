import { describe, expect, it } from 'vitest';
import { computePromotionBonus, selectPromotion, type PromotionRow } from '../../supabase/functions/_shared/promotions.ts';

const now = new Date('2026-10-06T12:00:00Z');
const promo = (over: Partial<PromotionRow>): PromotionRow => ({
  id: 'p1', code: null, type: 'first_purchase', config: { percent: 20 },
  valid_from: null, valid_until: null, is_active: true, ...over,
});
const first = promo({ id: 'first' });
const code = promo({ id: 'code', type: 'code', code: 'Verano', config: { percent: 15 } });
const pick = (over: Partial<Parameters<typeof selectPromotion>[0]>) =>
  selectPromotion({ promos: [first, code], promoCode: null, isFirstPurchase: false, usedPromotionIds: [], now, ...over });

describe('selectPromotion', () => {
  it('el código tiene prioridad sobre primera compra', () => {
    expect(pick({ promoCode: 'VERANO', isFirstPurchase: true })).toEqual({ id: 'code', type: 'code', percent: 15 });
  });

  it('el código aplica aunque no sea la primera compra', () => {
    expect(pick({ promoCode: 'VERANO' })).toEqual({ id: 'code', type: 'code', percent: 15 });
  });

  it('el código no distingue mayúsculas ni espacios', () => {
    expect(pick({ promoCode: ' verano ' })?.id).toBe('code');
  });

  it('un código ya usado por el usuario no aplica y cae a primera compra', () => {
    expect(pick({ promoCode: 'VERANO', isFirstPurchase: true, usedPromotionIds: ['code'] }))
      .toEqual({ id: 'first', type: 'first_purchase', percent: 20 });
  });

  it('un código ya usado en una compra posterior no da bono', () => {
    expect(pick({ promoCode: 'VERANO', usedPromotionIds: ['code'] })).toBe(null);
  });

  it('un código inexistente en primera compra cae a primera compra', () => {
    expect(pick({ promoCode: 'NOEXISTE', isFirstPurchase: true })?.type).toBe('first_purchase');
  });

  it('sin código y sin ser primera compra no hay promo', () => {
    expect(pick({})).toBe(null);
  });

  it('una promo de primera compra no se puede pedir por su código', () => {
    const named = promo({ id: 'first', code: 'FIRST_PURCHASE' });
    expect(selectPromotion({ promos: [named], promoCode: 'FIRST_PURCHASE', isFirstPurchase: false, usedPromotionIds: [], now })).toBe(null);
  });

  it('respeta los límites de vigencia', () => {
    const vigente = promo({ id: 'v', valid_from: '2026-10-01T00:00:00Z', valid_until: '2026-10-31T00:00:00Z' });
    expect(selectPromotion({ promos: [vigente], promoCode: null, isFirstPurchase: true, usedPromotionIds: [], now })?.id).toBe('v');
  });

  it('ignora promos inactivas, futuras, vencidas o con percent inválido', () => {
    const bad = [
      promo({ id: 'a', is_active: false }),
      promo({ id: 'b', valid_from: '2026-11-01T00:00:00Z' }),
      promo({ id: 'c', valid_until: '2026-10-01T00:00:00Z' }),
      promo({ id: 'd', config: { percent: 0 } }),
      promo({ id: 'e', config: { percent: '20' } }),
      promo({ id: 'f', config: null }),
      promo({ id: 'g', config: { percent: 101 } }),
    ];
    expect(selectPromotion({ promos: bad, promoCode: null, isFirstPurchase: true, usedPromotionIds: [], now })).toBe(null);
  });

  it('redondea un porcentaje fraccionario', () => {
    const p = promo({ config: { percent: 12.6 } });
    expect(selectPromotion({ promos: [p], promoCode: null, isFirstPurchase: true, usedPromotionIds: [], now })?.percent).toBe(13);
  });
});

describe('computePromotionBonus', () => {
  it('redondea hacia abajo', () => {
    expect(computePromotionBonus(10, 15)).toBe(1);
    expect(computePromotionBonus(50, 20)).toBe(10);
    expect(computePromotionBonus(10, 0)).toBe(0);
  });
});
