import { describe, expect, it } from 'vitest';
import { buildPreference, resolvePurchaseItem } from '../../supabase/functions/_shared/preference.ts';

const pack = { id: 'pack-1', base_tokens: 10, bonus_tokens: 2, price_cents: 2000 };

describe('resolvePurchaseItem', () => {
  it('toma tokens y precio del pack', () => {
    expect(resolvePurchaseItem({ pack, customTokens: null, pricePerTokenCents: 200 })).toEqual({
      ok: true, value: { packId: 'pack-1', baseTokens: 10, bonusTokens: 2, amountCents: 2000 },
    });
  });

  it('calcula el monto de una cantidad libre con el precio por token', () => {
    expect(resolvePurchaseItem({ pack: null, customTokens: 25, pricePerTokenCents: 150 })).toEqual({
      ok: true, value: { packId: null, baseTokens: 25, bonusTokens: 0, amountCents: 3750 },
    });
  });

  it('sin precio configurado usa 200 centavos por token', () => {
    const r = resolvePurchaseItem({ pack: null, customTokens: 3, pricePerTokenCents: null });
    expect(r.ok && r.value.amountCents).toBe(600);
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

describe('buildPreference', () => {
  const base = {
    item: { packId: 'pack-1', baseTokens: 10, bonusTokens: 2, amountCents: 2000 },
    promotion: null,
    userId: 'user-1',
    userEmail: 'ana@test.dev',
    appUrl: 'https://chorroybuenas.com.mx',
    mode: 'production' as const,
    notificationUrl: 'https://x.supabase.co/functions/v1/webhook-mercadopago',
  };

  it('arma la preferencia sin promoción', () => {
    const p = buildPreference(base);
    expect(p.metadata).toEqual({
      user_id: 'user-1', pack_id: 'pack-1', base_tokens: 10, bonus_tokens: 2, promotion_bonus: 0,
      total_tokens: 12, amount_cents: 2000, promotion_id: null, promotion_type: null,
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

  it('en producción envía el correo del comprador; en sandbox no', () => {
    expect(buildPreference(base).payer).toEqual({ email: 'ana@test.dev' });
    expect(buildPreference({ ...base, mode: 'sandbox' }).payer).toBeUndefined();
    expect(buildPreference({ ...base, userEmail: null }).payer).toBeUndefined();
  });

  it('convierte centavos a pesos sin perder decimales', () => {
    const p = buildPreference({ ...base, item: { ...base.item, amountCents: 1999 } });
    expect(p.items[0].unit_price).toBe(19.99);
  });
});
