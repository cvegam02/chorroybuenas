import { describe, expect, it } from 'vitest';
import { buildPreference, MIN_PURCHASE_CENTS, resolvePurchaseItem } from '../../supabase/functions/_shared/preference.ts';

const pack = { id: 'pack-1', base_tokens: 10, bonus_tokens: 2, price_cents: 2000 };

describe('resolvePurchaseItem', () => {
  it('toma tokens y precio del pack', () => {
    expect(resolvePurchaseItem({ pack, customTokens: null, pricePerTokenCents: 200 })).toEqual({
      ok: true, value: { packId: 'pack-1', baseTokens: 10, bonusTokens: 2, amountCents: 2000, offer: null },
    });
  });

  it('calcula el monto de una cantidad libre con el precio por token', () => {
    expect(resolvePurchaseItem({ pack: null, customTokens: 25, pricePerTokenCents: 150 })).toEqual({
      ok: true, value: { packId: null, baseTokens: 25, bonusTokens: 0, amountCents: 3750, offer: null },
    });
  });

  it('sin precio configurado usa 200 centavos por token', () => {
    const r = resolvePurchaseItem({ pack: null, customTokens: 6, pricePerTokenCents: null });
    expect(r.ok && r.value.amountCents).toBe(1200);
  });

  it.each([
    ['pack gratis', { pack: { ...pack, price_cents: 0 }, customTokens: null, pricePerTokenCents: 200 }],
    ['precio por token en 0', { pack: null, customTokens: 5, pricePerTokenCents: 0 }],
    ['precio fraccionario', { pack: null, customTokens: 5, pricePerTokenCents: 0.5 }],
    ['pack con tokens en 0', { pack: { ...pack, base_tokens: 0 }, customTokens: null, pricePerTokenCents: 200 }],
    ['ni pack ni cantidad', { pack: null, customTokens: null, pricePerTokenCents: 200 }],
  ])('rechaza: %s', (_name, input) => {
    expect(resolvePurchaseItem(input).ok).toBe(false);
  });
});

describe('resolvePurchaseItem con oferta vigente', () => {
  const offer = { id: 'offer-1', percent: 25 };

  it('descuenta el porcentaje del precio del pack', () => {
    expect(resolvePurchaseItem({ pack: { ...pack, base_tokens: 20, bonus_tokens: 5, price_cents: 4000 }, customTokens: null, pricePerTokenCents: 200, offer })).toEqual({
      ok: true, value: { packId: 'pack-1', baseTokens: 20, bonusTokens: 5, amountCents: 3000, offer },
    });
  });

  it('en la cantidad libre descuenta el precio por token: $2.00 → $1.50', () => {
    expect(resolvePurchaseItem({ pack: null, customTokens: 10, pricePerTokenCents: 200, offer })).toEqual({
      ok: true, value: { packId: null, baseTokens: 10, bonusTokens: 0, amountCents: 1500, offer },
    });
  });

  it('redondea el precio por token al centavo antes de multiplicar', () => {
    // $1.99 con 25% = $1.4925 → $1.49 por token; 10 tokens = $14.90 (no $14.93).
    const r = resolvePurchaseItem({ pack: null, customTokens: 10, pricePerTokenCents: 199, offer });
    expect(r.ok && r.value.amountCents).toBe(1490);
  });

  it('redondea al centavo el precio del pack', () => {
    const r = resolvePurchaseItem({ pack: { ...pack, price_cents: 1999 }, customTokens: null, pricePerTokenCents: 200, offer });
    expect(r.ok && r.value.amountCents).toBe(1499);
  });

  it('el descuento no cambia los tokens', () => {
    const r = resolvePurchaseItem({ pack, customTokens: null, pricePerTokenCents: 200, offer });
    expect(r.ok && [r.value.baseTokens, r.value.bonusTokens]).toEqual([10, 2]);
  });

  it('sin oferta cobra el precio normal', () => {
    const r = resolvePurchaseItem({ pack, customTokens: null, pricePerTokenCents: 200, offer: null });
    expect(r.ok && r.value.amountCents).toBe(2000);
  });
});

describe('buildPreference', () => {
  const base = {
    item: { packId: 'pack-1', baseTokens: 10, bonusTokens: 2, amountCents: 2000, offer: null },
    promotion: null,
    userId: 'user-1',
    appUrl: 'https://chorroybuenas.com.mx',
    notificationUrl: 'https://x.supabase.co/functions/v1/webhook-mercadopago',
  };

  it('arma la preferencia sin promoción', () => {
    const p = buildPreference(base);
    expect(p.metadata).toEqual({
      user_id: 'user-1', pack_id: 'pack-1', base_tokens: 10, bonus_tokens: 2, promotion_bonus: 0,
      total_tokens: 12, amount_cents: 2000, promotion_id: null, promotion_type: null,
      offer_id: null, offer_percent: null,
    });
    expect(p.items[0]).toMatchObject({ title: 'Tokens de IA - 12 tokens', quantity: 1, unit_price: 20, currency_id: 'MXN' });
    expect(p.items[0].description).toBe('Pack de 10 tokens + 2 de regalo');
    expect(p.external_reference).toBe('user-1');
    expect(p.notification_url).toBe(base.notificationUrl);
    expect(p.auto_return).toBe('approved');
  });

  it('incluye el bono y los datos de la promoción', () => {
    const p = buildPreference({ ...base, promotion: { id: 'promo-1', type: 'code', percent: 15 } });
    expect(p.metadata).toMatchObject({ promotion_bonus: 1, total_tokens: 13, promotion_id: 'promo-1', promotion_type: 'code' });
    expect(p.items[0].title).toBe('Tokens de IA - 13 tokens');
    expect(p.items[0].description).toBe('Pack de 10 tokens + 2 de regalo + 1 de promoción');
  });

  it('una promoción que redondea a 0 no se registra como aplicada', () => {
    const p = buildPreference({ ...base, item: { ...base.item, baseTokens: 3, bonusTokens: 0 }, promotion: { id: 'promo-1', type: 'code', percent: 15 } });
    expect(p.metadata).toMatchObject({ promotion_bonus: 0, promotion_id: null, promotion_type: null });
    expect(p.items[0].description).toBe('Pack de 3 tokens');
  });

  it('las URLs de retorno salen del appUrl', () => {
    expect(buildPreference(base).back_urls).toEqual({
      success: 'https://chorroybuenas.com.mx/comprar-tokens?success=1&payment_id={payment_id}',
      failure: 'https://chorroybuenas.com.mx/comprar-tokens?cancel=1',
      pending: 'https://chorroybuenas.com.mx/comprar-tokens?pending=1&payment_id={payment_id}',
    });
  });

  it('no envía datos del comprador: Mercado Pago los pide en su checkout', () => {
    expect('payer' in buildPreference(base)).toBe(false);
  });

  it('convierte centavos a pesos sin perder decimales', () => {
    const p = buildPreference({ ...base, item: { ...base.item, amountCents: 1999 } });
    expect(p.items[0].unit_price).toBe(19.99);
  });

  it('con oferta cobra el precio con descuento y guarda la oferta', () => {
    const offer = { id: 'offer-1', percent: 25 };
    const p = buildPreference({ ...base, item: { packId: 'pack-20', baseTokens: 20, bonusTokens: 5, amountCents: 3000, offer } });
    expect(p.metadata).toMatchObject({ amount_cents: 3000, offer_id: 'offer-1', offer_percent: 25, total_tokens: 25 });
    expect(p.items[0].unit_price).toBe(30);
    expect(p.items[0].description).toBe('Pack de 20 tokens + 5 de regalo · 25% de descuento');
  });

  it('oferta + código: el descuento en el precio y los tokens extra del código se suman', () => {
    const offer = { id: 'offer-1', percent: 25 };
    const p = buildPreference({
      ...base,
      item: { packId: 'pack-20', baseTokens: 20, bonusTokens: 5, amountCents: 3000, offer },
      promotion: { id: 'promo-1', type: 'code', percent: 20 },
    });
    expect(p.metadata).toMatchObject({
      amount_cents: 3000, offer_id: 'offer-1', offer_percent: 25,
      promotion_bonus: 4, promotion_id: 'promo-1', total_tokens: 29,
    });
  });

  it('oferta + primera compra: también se suman', () => {
    const offer = { id: 'offer-1', percent: 25 };
    const p = buildPreference({
      ...base,
      item: { packId: null, baseTokens: 10, bonusTokens: 0, amountCents: 1500, offer },
      promotion: { id: 'promo-2', type: 'first_purchase', percent: 10 },
    });
    expect(p.metadata).toMatchObject({ amount_cents: 1500, offer_percent: 25, promotion_bonus: 1, total_tokens: 11 });
  });
});

describe('mínimo de compra en pesos (FEAT-58, decisión 2)', () => {
  it('el mínimo es $10.00 MXN', () => {
    expect(MIN_PURCHASE_CENTS).toBe(1000);
  });

  it('con oferta, 5 tokens a $1.00 ($5.00) se rechazan', () => {
    const r = resolvePurchaseItem({ pack: null, customTokens: 5, pricePerTokenCents: 200, offer: { id: 'o', percent: 50 } });
    expect(r).toEqual({ ok: false, message: 'El monto mínimo de compra es $10.00 MXN.' });
  });

  it('con oferta, 10 tokens a $1.00 ($10.00) sí pasan', () => {
    const r = resolvePurchaseItem({ pack: null, customTokens: 10, pricePerTokenCents: 200, offer: { id: 'o', percent: 50 } });
    expect(r.ok && r.value.amountCents).toBe(1000);
  });

  it('un pack que con la oferta queda por debajo se rechaza', () => {
    const r = resolvePurchaseItem({ pack, customTokens: null, pricePerTokenCents: 200, offer: { id: 'o', percent: 60 } });
    expect(r.ok).toBe(false);
  });

  it('sin oferta, 5 tokens a $2.00 siguen pasando', () => {
    const r = resolvePurchaseItem({ pack: null, customTokens: 5, pricePerTokenCents: 200 });
    expect(r.ok && r.value.amountCents).toBe(1000);
  });
});
