import { describe, expect, it } from 'vitest';
import {
  buildSeasonalDelivery, buildSeasonalPending, buildSeasonalPreference, checkSeasonalPurchase,
  classifyUnapprovedStatus, parseSeasonalPreferenceRequest,
  type SeasonalLoteriaRow,
} from '../../supabase/functions/_shared/seasonal.ts';

const USER = '11111111-1111-4111-8111-111111111111';
const LOTERIA = '22222222-2222-4222-8222-222222222222';
const NOW = new Date('2026-10-06T12:00:00Z');

const loteria = (over: Partial<SeasonalLoteriaRow> = {}): SeasonalLoteriaRow => ({
  id: LOTERIA, name_es: 'Día de Muertos', price_cents: 4900, is_published: true,
  valid_from: null, valid_until: null, ...over,
});

describe('parseSeasonalPreferenceRequest', () => {
  it('acepta loteria_id y app_url', () => {
    expect(parseSeasonalPreferenceRequest({ loteria_id: LOTERIA, app_url: 'https://dev.chorroybuenas.com.mx' }))
      .toEqual({ ok: true, value: { loteriaId: LOTERIA, appUrl: 'https://dev.chorroybuenas.com.mx' } });
  });

  it('ignora el precio que mande el navegador', () => {
    const parsed = parseSeasonalPreferenceRequest({ loteria_id: LOTERIA, price_cents: 1, amount_cents: 1 });
    expect(parsed).toEqual({ ok: true, value: { loteriaId: LOTERIA, appUrl: null } });
  });

  it.each([
    ['cuerpo vacío', null],
    ['sin loteria_id', {}],
    ['loteria_id que no es uuid', { loteria_id: 'abc' }],
    ['loteria_id numérico', { loteria_id: 5 }],
  ])('rechaza: %s', (_name, body) => {
    expect(parseSeasonalPreferenceRequest(body).ok).toBe(false);
  });
});

describe('checkSeasonalPurchase', () => {
  const check = (row: SeasonalLoteriaRow | null, alreadyOwned = false, hasPending = false) =>
    checkSeasonalPurchase({ loteria: row, alreadyOwned, hasPending, now: NOW });

  it('lotería visible que la cuenta no tiene: se puede cobrar', () => {
    expect(check(loteria())).toEqual({ ok: true, value: { loteriaId: LOTERIA, name: 'Día de Muertos', amountCents: 4900 } });
  });

  it('dentro de sus fechas: se puede cobrar', () => {
    expect(check(loteria({ valid_from: '2026-10-01T00:00:00Z', valid_until: '2026-11-03T00:00:00Z' })).ok).toBe(true);
  });

  it.each([
    ['inexistente', null],
    ['borrador', loteria({ is_published: false })],
    ['programada (aún no empieza)', loteria({ valid_from: '2026-10-07T00:00:00Z' })],
    ['fuera de fechas (ya terminó)', loteria({ valid_until: '2026-10-05T00:00:00Z' })],
    ['termina justo ahora', loteria({ valid_until: NOW.toISOString() })],
    ['sin precio', loteria({ price_cents: null })],
    ['precio menor al mínimo', loteria({ price_cents: 999 })],
  ])('no se puede cobrar una lotería no visible: %s', (_name, row) => {
    expect(check(row)).toEqual({ ok: false, error: 'NOT_AVAILABLE' });
  });

  it('no se puede cobrar una lotería que la cuenta ya tiene', () => {
    expect(check(loteria(), true)).toEqual({ ok: false, error: 'ALREADY_OWNED' });
  });

  it('si ya la tiene y además dejó de estar visible, avisa que ya es suya', () => {
    expect(check(loteria({ is_published: false }), true)).toEqual({ ok: false, error: 'ALREADY_OWNED' });
  });
});

describe('checkSeasonalPurchase: pago en proceso', () => {
  const check = (row: SeasonalLoteriaRow | null, alreadyOwned: boolean, hasPending: boolean) =>
    checkSeasonalPurchase({ loteria: row, alreadyOwned, hasPending, now: NOW });

  it('con un pago en proceso no se puede iniciar otro cobro por la misma lotería', () => {
    expect(check(loteria(), false, true)).toEqual({ ok: false, error: 'PAYMENT_PENDING' });
  });

  it('avisa del pago en proceso aunque la lotería haya dejado de estar visible', () => {
    expect(check(loteria({ is_published: false }), false, true)).toEqual({ ok: false, error: 'PAYMENT_PENDING' });
  });

  it('si ya es suya, eso pesa más que un pago en proceso', () => {
    expect(check(loteria(), true, true)).toEqual({ ok: false, error: 'ALREADY_OWNED' });
  });
});

describe('buildSeasonalPreference', () => {
  const preference = buildSeasonalPreference({
    item: { loteriaId: LOTERIA, name: 'Día de Muertos', amountCents: 4900 },
    userId: USER,
    appUrl: 'https://chorroybuenas.com.mx',
    notificationUrl: 'https://x.supabase.co/functions/v1/webhook-mercadopago',
  });

  it('cobra el precio de la base, en pesos', () => {
    expect(preference.items).toEqual([
      expect.objectContaining({ title: 'Lotería de temporada - Día de Muertos', quantity: 1, unit_price: 49, currency_id: 'MXN' }),
    ]);
  });

  it('marca la preferencia como lotería de temporada y guarda el precio con que inició el pago', () => {
    expect(preference.metadata).toEqual({ kind: 'seasonal', user_id: USER, loteria_id: LOTERIA, amount_cents: 4900 });
    expect(preference.external_reference).toBe(USER);
  });

  it('regresa al detalle de la lotería', () => {
    expect(preference.back_urls).toEqual({
      success: `https://chorroybuenas.com.mx/temporada/${LOTERIA}?success=1&payment_id={payment_id}`,
      failure: `https://chorroybuenas.com.mx/temporada/${LOTERIA}?cancel=1`,
      pending: `https://chorroybuenas.com.mx/temporada/${LOTERIA}?pending=1&payment_id={payment_id}`,
    });
    expect(preference.auto_return).toBe('approved');
    expect(preference.notification_url).toBe('https://x.supabase.co/functions/v1/webhook-mercadopago');
  });
});

describe('buildSeasonalDelivery', () => {
  const metadata = { kind: 'seasonal', user_id: USER, loteria_id: LOTERIA, amount_cents: 4900 };
  const build = (payment: Record<string, unknown>, meta: Record<string, unknown> = metadata, userId = USER) =>
    buildSeasonalDelivery({ userId, paymentId: '555', payment, metadata: meta });

  it('entrega la lotería con el monto con que inició el pago', () => {
    const payment = { transaction_amount: 49 };
    expect(build(payment)).toEqual({
      p_user_id: USER, p_loteria_id: LOTERIA, p_amount_cents: 4900,
      p_payment_provider: 'mercadopago', p_payment_id: '555', p_payment_metadata: payment,
    });
  });

  it('pagar de más no impide la entrega', () => {
    expect(build({ transaction_amount: 60 })).not.toBeNull();
  });

  it.each([
    ['monto pagado menor al precio', { transaction_amount: 48.99 }, metadata],
    ['pago sin monto', {}, metadata],
    ['monto que no es número', { transaction_amount: '49' }, metadata],
    ['metadata sin lotería', { transaction_amount: 49 }, { ...metadata, loteria_id: undefined }],
    ['lotería que no es uuid', { transaction_amount: 49 }, { ...metadata, loteria_id: 'abc' }],
    ['metadata sin monto', { transaction_amount: 49 }, { ...metadata, amount_cents: undefined }],
    ['monto de la metadata en cero', { transaction_amount: 49 }, { ...metadata, amount_cents: 0 }],
    ['monto de la metadata menor al mínimo', { transaction_amount: 49 }, { ...metadata, amount_cents: 500 }],
  ])('no entrega: %s', (_name, payment, meta) => {
    expect(build(payment, meta)).toBeNull();
  });

  it('no entrega si el pago es de una cuenta distinta a la de la preferencia', () => {
    expect(build({ transaction_amount: 49 }, metadata, '33333333-3333-4333-8333-333333333333')).toBeNull();
  });

  it('no entrega si quien pagó no es una cuenta válida', () => {
    expect(build({ transaction_amount: 49 }, { ...metadata, user_id: 'x' }, 'x')).toBeNull();
  });
});

describe('classifyUnapprovedStatus', () => {
  it.each(['pending', 'in_process', 'authorized'])('%s: el pago sigue en proceso', (status) => {
    expect(classifyUnapprovedStatus(status)).toBe('pending');
  });

  it.each(['rejected', 'cancelled'])('%s: el pago ya no va a completarse', (status) => {
    expect(classifyUnapprovedStatus(status)).toBe('released');
  });

  it.each(['approved', 'refunded', 'charged_back', 'in_mediation', 'otro', undefined, null, 5])(
    '%s: no se registra nada', (status) => {
      expect(classifyUnapprovedStatus(status)).toBeNull();
    });
});

describe('buildSeasonalPending', () => {
  const metadata = { kind: 'seasonal', user_id: USER, loteria_id: LOTERIA, amount_cents: 4900 };
  const build = (meta: Record<string, unknown> = metadata, userId = USER) =>
    buildSeasonalPending({ userId, paymentId: '555', payment: { status: 'pending' }, metadata: meta });

  it('registra el pendiente con el precio con que inició el pago, aunque todavía no haya monto pagado', () => {
    expect(build()).toEqual({
      p_user_id: USER, p_loteria_id: LOTERIA, p_amount_cents: 4900,
      p_payment_provider: 'mercadopago', p_payment_id: '555', p_payment_metadata: { status: 'pending' },
    });
  });

  it.each([
    ['metadata de tokens', { base_tokens: 10, amount_cents: 2000 }],
    ['lotería que no es uuid', { ...metadata, loteria_id: 'abc' }],
    ['monto menor al mínimo', { ...metadata, amount_cents: 500 }],
    ['pago de otra cuenta', { ...metadata, user_id: '33333333-3333-4333-8333-333333333333' }],
  ])('no registra: %s', (_name, meta) => {
    expect(build(meta)).toBeNull();
  });
});
