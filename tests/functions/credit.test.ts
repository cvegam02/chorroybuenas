import { describe, expect, it } from 'vitest';
import { buildCreditParams, type PreferenceMetadata } from '../../supabase/functions/_shared/credit.ts';

const meta = (over: Partial<PreferenceMetadata> = {}): PreferenceMetadata => ({
  pack_id: null, base_tokens: 10, bonus_tokens: 2, promotion_bonus: 2, amount_cents: 2000,
  promotion_id: 'promo-1', promotion_type: 'code', ...over,
});
const input = (over: Partial<Parameters<typeof buildCreditParams>[0]> = {}) => ({
  userId: 'user-1', paymentId: '123', status: 'approved',
  payment: { transaction_amount: 20 }, metadata: meta(), isFirstPurchase: false, ...over,
});

describe('buildCreditParams', () => {
  it('acredita base + bono de pack + bono de código aunque no sea primera compra', () => {
    expect(buildCreditParams(input())).toMatchObject({
      p_user_id: 'user-1', p_tokens_to_add: 14, p_base_tokens: 10, p_bonus_tokens: 4,
      p_total_tokens: 14, p_amount_cents: 2000, p_payment_id: '123',
      p_payment_provider: 'mercadopago', p_promotion_ids: ['promo-1'],
    });
  });

  it('anula el bono de primera compra si ya no es la primera', () => {
    const r = buildCreditParams(input({ metadata: meta({ promotion_type: 'first_purchase' }) }));
    expect(r).toMatchObject({ p_tokens_to_add: 12, p_bonus_tokens: 2, p_promotion_ids: null });
  });

  it('conserva el bono de primera compra si sí es la primera', () => {
    const r = buildCreditParams(input({ metadata: meta({ promotion_type: 'first_purchase' }), isFirstPurchase: true }));
    expect(r).toMatchObject({ p_tokens_to_add: 14, p_promotion_ids: ['promo-1'] });
  });

  it('metadata legacy sin promotion_type se trata como primera compra', () => {
    const legacy = meta({ promotion_type: undefined, promotion_id: undefined });
    expect(buildCreditParams(input({ metadata: legacy }))).toMatchObject({ p_tokens_to_add: 12, p_promotion_ids: null });
    expect(buildCreditParams(input({ metadata: legacy, isFirstPurchase: true }))).toMatchObject({ p_tokens_to_add: 14, p_promotion_ids: null });
  });

  it('rechaza si el monto pagado es menor al esperado', () => {
    expect(buildCreditParams(input({ payment: { transaction_amount: 1 } }))).toBe(null);
  });

  it('acepta el monto exacto aunque tenga decimales imprecisos', () => {
    const r = buildCreditParams(input({ payment: { transaction_amount: 19.99 }, metadata: meta({ amount_cents: 1999 }) }));
    expect(r).not.toBe(null);
  });

  it.each([[{}], [{ transaction_amount: '20' }], [{ transaction_amount: null }]])(
    'rechaza si el pago no trae el monto como número, igual que las temáticas (FEAT-58, H10): %j', (payment) => {
      expect(buildCreditParams(input({ payment }))).toBe(null);
    },
  );

  it('guarda el pago completo y el pack en los parámetros', () => {
    const r = buildCreditParams(input({ metadata: meta({ pack_id: 'pack-1' }) }));
    expect(r).toMatchObject({ p_pack_id: 'pack-1', p_payment_status: 'approved', p_payment_metadata: { transaction_amount: 20 } });
  });

  it('trata campos ausentes de la metadata como 0', () => {
    expect(buildCreditParams(input({ metadata: { base_tokens: 5 }, payment: { transaction_amount: 10 } }))).toMatchObject({
      p_tokens_to_add: 5, p_bonus_tokens: 0, p_amount_cents: 0, p_pack_id: null,
    });
  });

  it.each([
    ['sin tokens', { base_tokens: 0, bonus_tokens: 0, promotion_bonus: 0 }],
    ['tokens fraccionarios', { base_tokens: 1.5 }],
    ['tokens negativos', { base_tokens: -5 }],
    ['tokens como texto', { base_tokens: '10' as unknown as number }],
    ['monto no entero', { amount_cents: 10.5 }],
  ])('rechaza metadata inválida: %s', (_name, over) => {
    expect(buildCreditParams(input({ metadata: meta(over) }))).toBe(null);
  });
});

describe('buildCreditParams con oferta', () => {
  const offerMeta = (over: Partial<PreferenceMetadata> = {}) =>
    meta({ base_tokens: 20, bonus_tokens: 5, promotion_bonus: 0, promotion_id: null, promotion_type: null,
      amount_cents: 3000, offer_id: 'offer-1', offer_percent: 25, ...over });

  it('guarda la oferta que tuvo la compra', () => {
    expect(buildCreditParams(input({ metadata: offerMeta(), payment: { transaction_amount: 30 } }))).toMatchObject({
      p_tokens_to_add: 25, p_amount_cents: 3000, p_offer_id: 'offer-1', p_offer_percent: 25,
    });
  });

  it('sin oferta manda la oferta vacía', () => {
    expect(buildCreditParams(input())).toMatchObject({ p_offer_id: null, p_offer_percent: null });
  });

  it('un pago pendiente iniciado con oferta se acredita con el precio con descuento, aunque la oferta ya terminó', () => {
    // La acreditación compara contra el monto guardado al iniciar ese pago, no contra la oferta de hoy.
    expect(buildCreditParams(input({ metadata: offerMeta(), payment: { transaction_amount: 30 }, status: 'approved' }))).not.toBe(null);
  });

  it('rechaza un monto menor al esperado para ese pago', () => {
    expect(buildCreditParams(input({ metadata: offerMeta(), payment: { transaction_amount: 29.99 } }))).toBe(null);
  });

  it('oferta + código: acredita los tokens extra del código', () => {
    const r = buildCreditParams(input({
      metadata: offerMeta({ promotion_bonus: 4, promotion_id: 'promo-1', promotion_type: 'code' }),
      payment: { transaction_amount: 30 },
    }));
    expect(r).toMatchObject({ p_tokens_to_add: 29, p_offer_percent: 25, p_promotion_ids: ['promo-1'] });
  });

  it.each([
    ['descuento sin oferta', { offer_id: null, offer_percent: 25 }],
    ['oferta sin descuento', { offer_id: 'offer-1', offer_percent: null }],
    ['descuento de 0%', { offer_percent: 0 }],
    ['descuento de 100%', { offer_percent: 100 }],
    ['descuento fraccionario', { offer_percent: 12.5 }],
    ['oferta que no es texto', { offer_id: 7 as unknown as string }],
  ])('rechaza metadata de oferta inválida: %s', (_name, over) => {
    expect(buildCreditParams(input({ metadata: offerMeta(over), payment: { transaction_amount: 30 } }))).toBe(null);
  });
});
