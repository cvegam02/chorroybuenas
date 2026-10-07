import { describe, expect, it, vi } from 'vitest';
import {
  creditPayment, findApprovedPayment, parseNotification, type PaymentDeps,
} from '../../supabase/functions/_shared/paymentFlow.ts';

const USER = 'user-1';
const metadata = { base_tokens: 10, bonus_tokens: 2, promotion_bonus: 0, amount_cents: 2000, pack_id: null };
const approvedPayment = {
  id: 555, status: 'approved', external_reference: USER, transaction_amount: 20,
  metadata: { preference_id: 'pref-1' },
};

function deps(routes: Record<string, unknown | Error | unknown[]>, over: Partial<PaymentDeps> = {}) {
  const calls: string[] = [];
  const queues = new Map<string, unknown[]>();
  const d: PaymentDeps = {
    mpGet: async <T>(path: string) => {
      calls.push(path);
      if (!(path in routes)) return null;
      let value = routes[path];
      if (Array.isArray(value)) {
        if (!queues.has(path)) queues.set(path, [...value]);
        const queue = queues.get(path) as unknown[];
        value = queue.length > 1 ? queue.shift() : queue[0];
      }
      if (value instanceof Error) throw value;
      return value as T;
    },
    countPurchases: vi.fn(async () => 0),
    credit: vi.fn(async () => 12),
    deliverSeasonal: vi.fn(async () => 'approved' as const),
    sleep: vi.fn(async () => {}),
    ...over,
  };
  return { d, calls };
}

const notif = (over: Partial<Parameters<typeof parseNotification>[0]> = {}) => ({
  method: 'POST', url: new URL('https://x.test/webhook'), contentType: 'application/json', bodyText: '', ...over,
});

describe('parseNotification', () => {
  it('lee el formato webhook JSON (type + data.id)', () => {
    expect(parseNotification(notif({ bodyText: JSON.stringify({ type: 'payment', data: { id: '123' } }) })))
      .toEqual({ topic: 'payment', id: '123', signedDataId: '123' });
  });

  it('acepta data.id numérico', () => {
    expect(parseNotification(notif({ bodyText: JSON.stringify({ topic: 'payment', data: { id: 123 } }) })).id).toBe('123');
  });

  it('lee el formato IPN por query string', () => {
    expect(parseNotification(notif({ method: 'GET', url: new URL('https://x.test/webhook?topic=merchant_order&id=987') })))
      .toEqual({ topic: 'merchant_order', id: '987', signedDataId: null });
  });

  it('prefiere data.id del query string como id firmado', () => {
    const n = parseNotification(notif({
      url: new URL('https://x.test/webhook?data.id=ABC&type=payment'),
      bodyText: JSON.stringify({ type: 'payment', data: { id: 'abc' } }),
    }));
    expect(n.signedDataId).toBe('ABC');
  });

  it('lee cuerpos form-urlencoded', () => {
    expect(parseNotification(notif({ contentType: 'application/x-www-form-urlencoded', bodyText: 'topic=payment&id=42' })))
      .toMatchObject({ topic: 'payment', id: '42' });
  });

  it('extrae el id del campo resource', () => {
    const body = JSON.stringify({ topic: 'merchant_order', resource: 'https://api.mercadopago.com/merchant_orders/777' });
    expect(parseNotification(notif({ bodyText: body })).id).toBe('777');
  });

  it.each([
    ['JSON inválido', '{no es json'],
    ['JSON que no es objeto', '"hola"'],
    ['cuerpo vacío', ''],
  ])('no truena con %s', (_name, bodyText) => {
    expect(parseNotification(notif({ bodyText }))).toEqual({ topic: null, id: null, signedDataId: null });
  });
});

describe('findApprovedPayment', () => {
  it('devuelve el pago aprobado con su preferencia y usuario', async () => {
    const { d } = deps({ '/v1/payments/555': approvedPayment });
    expect(await findApprovedPayment(d, { topic: 'payment', id: '555' })).toEqual({
      ok: true,
      value: { paymentId: '555', payment: approvedPayment, externalReference: USER, preferenceId: 'pref-1' },
    });
  });

  it('usa preference_id de primer nivel si no viene en metadata', async () => {
    const { d } = deps({ '/v1/payments/555': { ...approvedPayment, metadata: {}, preference_id: 'pref-2' } });
    const r = await findApprovedPayment(d, { topic: 'payment', id: '555' });
    expect(r.ok && r.value.preferenceId).toBe('pref-2');
  });

  it('si el pago no trae la preferencia, la obtiene de su orden', async () => {
    const payment = { ...approvedPayment, metadata: {}, order: { id: 45033499031, type: 'mercadopago' } };
    const { d, calls } = deps({
      '/v1/payments/555': payment,
      '/merchant_orders/45033499031': { preference_id: 'pref-de-la-orden', external_reference: USER },
    });
    const r = await findApprovedPayment(d, { topic: 'payment', id: '555' });
    expect(r.ok && r.value.preferenceId).toBe('pref-de-la-orden');
    expect(r.ok && r.value.paymentId).toBe('555');
    expect(calls).toEqual(['/v1/payments/555', '/merchant_orders/45033499031']);
  });

  it('si el pago trae la preferencia no consulta la orden', async () => {
    const { d, calls } = deps({ '/v1/payments/555': { ...approvedPayment, order: { id: 1 } } });
    await findApprovedPayment(d, { topic: 'payment', id: '555' });
    expect(calls).toEqual(['/v1/payments/555']);
  });

  it('pago sin preferencia y con una orden que no existe o no es válida', async () => {
    const { d } = deps({ '/v1/payments/555': { ...approvedPayment, metadata: {}, order: { id: 777 } } });
    expect(await findApprovedPayment(d, { topic: 'payment', id: '555' })).toEqual({ ok: false, reason: 'missing_reference' });
    const { d: d2, calls } = deps({ '/v1/payments/555': { ...approvedPayment, metadata: {}, order: { id: '../x' } } });
    expect(await findApprovedPayment(d2, { topic: 'payment', id: '555' })).toEqual({ ok: false, reason: 'missing_reference' });
    expect(calls).toEqual(['/v1/payments/555']);
  });

  it('pago pendiente: no hay nada que acreditar', async () => {
    const { d } = deps({ '/v1/payments/555': { ...approvedPayment, status: 'pending' } });
    expect(await findApprovedPayment(d, { topic: 'payment', id: '555' })).toEqual({ ok: false, reason: 'not_approved', status: 'pending' });
  });

  it('pago inexistente', async () => {
    const { d } = deps({});
    expect(await findApprovedPayment(d, { topic: 'payment', id: '555' })).toEqual({ ok: false, reason: 'payment_not_found' });
  });

  it.each([
    ['tema desconocido', { topic: 'chargebacks', id: '1' }],
    ['sin tema', { topic: null, id: '1' }],
    ['sin id', { topic: 'payment', id: null }],
    ['id con caracteres de ruta', { topic: 'payment', id: '1/../../x' }],
  ])('ignora: %s', async (_name, n) => {
    const { d, calls } = deps({});
    expect(await findApprovedPayment(d, n)).toEqual({ ok: false, reason: 'ignored' });
    expect(calls).toHaveLength(0);
  });

  it('pago sin external_reference o sin preferencia', async () => {
    const { d } = deps({ '/v1/payments/555': { ...approvedPayment, external_reference: null } });
    expect(await findApprovedPayment(d, { topic: 'payment', id: '555' })).toEqual({ ok: false, reason: 'missing_reference' });
    const { d: d2 } = deps({ '/v1/payments/555': { ...approvedPayment, metadata: {} } });
    expect(await findApprovedPayment(d2, { topic: 'payment', id: '555' })).toEqual({ ok: false, reason: 'missing_reference' });
  });

  it('un error de la API de MP se propaga (para que el webhook responda 500)', async () => {
    const { d } = deps({ '/v1/payments/555': new Error('MP respondió 503') });
    await expect(findApprovedPayment(d, { topic: 'payment', id: '555' })).rejects.toThrow('503');
  });

  it('merchant_order: toma el pago aprobado de la orden', async () => {
    const order = { external_reference: USER, preference_id: 'pref-1', payments: [{ id: 1, status: 'rejected' }, { id: 2, status: 'approved', transaction_amount: 20 }] };
    const { d } = deps({ '/merchant_orders/987': order });
    expect(await findApprovedPayment(d, { topic: 'merchant_order', id: '987' })).toEqual({
      ok: true,
      value: { paymentId: '2', payment: order.payments[1], externalReference: USER, preferenceId: 'pref-1' },
    });
  });

  it('merchant_order sin pagos: reintenta una vez tras esperar', async () => {
    const empty = { external_reference: USER, preference_id: 'pref-1', payments: [] };
    const filled = { ...empty, payments: [{ id: 2, status: 'approved' }] };
    const { d, calls } = deps({ '/merchant_orders/987': [empty, filled] });
    const r = await findApprovedPayment(d, { topic: 'merchant_order', id: '987' });
    expect(r.ok).toBe(true);
    expect(calls).toHaveLength(2);
    expect(d.sleep).toHaveBeenCalledTimes(1);
  });

  it('merchant_order sin pago aprobado ni tras el reintento', async () => {
    const { d } = deps({ '/merchant_orders/987': { payments: [] } });
    expect(await findApprovedPayment(d, { topic: 'merchant_order', id: '987' }))
      .toEqual({ ok: false, reason: 'not_approved', status: 'sin_pagos' });
  });

  it('merchant_order con pagos rechazados: informa estado y motivo de cada uno', async () => {
    const order = { payments: [
      { id: 1, status: 'rejected', status_detail: 'cc_rejected_high_risk' },
      { id: 2, status: 'in_process' },
    ] };
    const { d } = deps({ '/merchant_orders/987': order });
    expect(await findApprovedPayment(d, { topic: 'merchant_order', id: '987' }))
      .toEqual({ ok: false, reason: 'not_approved', status: 'rejected/cc_rejected_high_risk, in_process/-' });
  });

  it('merchant_order inexistente', async () => {
    const { d } = deps({});
    expect(await findApprovedPayment(d, { topic: 'merchant_order', id: '987' })).toEqual({ ok: false, reason: 'payment_not_found' });
  });
});

describe('creditPayment', () => {
  const found = { paymentId: '555', payment: approvedPayment, externalReference: USER, preferenceId: 'pref-1' };

  it('acredita con los tokens de la preferencia y devuelve el saldo', async () => {
    const { d } = deps({ '/checkout/preferences/pref-1': { metadata } });
    expect(await creditPayment(d, found)).toEqual({ ok: true, value: { kind: 'tokens', balance: 12 } });
    expect(d.deliverSeasonal).not.toHaveBeenCalled();
    expect(d.credit).toHaveBeenCalledWith(expect.objectContaining({
      p_user_id: USER, p_payment_id: '555', p_tokens_to_add: 12, p_amount_cents: 2000,
    }));
  });

  it('revalida la primera compra con el conteo actual', async () => {
    const withPromo = { ...metadata, promotion_bonus: 2, promotion_type: 'first_purchase' };
    const { d } = deps({ '/checkout/preferences/pref-1': { metadata: withPromo } }, { countPurchases: vi.fn(async () => 3) });
    await creditPayment(d, found);
    expect(d.credit).toHaveBeenCalledWith(expect.objectContaining({ p_tokens_to_add: 12 }));
    expect(d.countPurchases).toHaveBeenCalledWith(USER);
  });

  it.each([
    ['preferencia inexistente', {}],
    ['preferencia sin metadata', { '/checkout/preferences/pref-1': {} }],
    ['metadata sin tokens', { '/checkout/preferences/pref-1': { metadata: { base_tokens: 0 } } }],
    ['monto pagado menor', { '/checkout/preferences/pref-1': { metadata: { ...metadata, amount_cents: 999999 } } }],
  ])('no acredita: %s', async (_name, routes) => {
    const { d } = deps(routes);
    expect(await creditPayment(d, found)).toEqual({ ok: false, reason: 'invalid_metadata' });
    expect(d.credit).not.toHaveBeenCalled();
  });

  it('si falla el conteo de compras, el error se propaga y no se acredita', async () => {
    const { d } = deps({ '/checkout/preferences/pref-1': { metadata } }, { countPurchases: vi.fn(async () => { throw new Error('db caída'); }) });
    await expect(creditPayment(d, found)).rejects.toThrow('db caída');
    expect(d.credit).not.toHaveBeenCalled();
  });

  it('si falla la acreditación, el error se propaga', async () => {
    const { d } = deps({ '/checkout/preferences/pref-1': { metadata } }, { credit: vi.fn(async () => { throw new Error('rpc falló'); }) });
    await expect(creditPayment(d, found)).rejects.toThrow('rpc falló');
  });
});

describe('creditPayment: lotería de temporada', () => {
  const BUYER = '11111111-1111-4111-8111-111111111111';
  const LOTERIA = '22222222-2222-4222-8222-222222222222';
  const seasonal = { kind: 'seasonal', user_id: BUYER, loteria_id: LOTERIA, amount_cents: 4900 };
  const found = {
    paymentId: '777', payment: { id: 777, status: 'approved', transaction_amount: 49 },
    externalReference: BUYER, preferenceId: 'pref-s',
  };

  it('una preferencia de temporada entrega la lotería y no suma tokens', async () => {
    const { d } = deps({ '/checkout/preferences/pref-s': { metadata: seasonal } });
    expect(await creditPayment(d, found)).toEqual({
      ok: true, value: { kind: 'seasonal', loteriaId: LOTERIA, status: 'approved' },
    });
    expect(d.deliverSeasonal).toHaveBeenCalledWith(expect.objectContaining({
      p_user_id: BUYER, p_loteria_id: LOTERIA, p_amount_cents: 4900, p_payment_id: '777',
    }));
    expect(d.credit).not.toHaveBeenCalled();
    expect(d.countPurchases).not.toHaveBeenCalled();
  });

  it('informa cuando el pago quedó guardado como repetido', async () => {
    const { d } = deps(
      { '/checkout/preferences/pref-s': { metadata: seasonal } },
      { deliverSeasonal: vi.fn(async () => 'repeated' as const) },
    );
    expect(await creditPayment(d, found)).toEqual({
      ok: true, value: { kind: 'seasonal', loteriaId: LOTERIA, status: 'repeated' },
    });
  });

  it('monto pagado menor al precio: no entrega ni suma tokens', async () => {
    const { d } = deps({ '/checkout/preferences/pref-s': { metadata: seasonal } });
    const underpaid = { ...found, payment: { ...found.payment, transaction_amount: 10 } };
    expect(await creditPayment(d, underpaid)).toEqual({ ok: false, reason: 'invalid_metadata' });
    expect(d.deliverSeasonal).not.toHaveBeenCalled();
    expect(d.credit).not.toHaveBeenCalled();
  });

  it('una preferencia de temporada nunca se acredita como tokens, aunque traiga tokens en la metadata', async () => {
    const mixed = { ...seasonal, loteria_id: 'rota', base_tokens: 10, bonus_tokens: 2 };
    const { d } = deps({ '/checkout/preferences/pref-s': { metadata: mixed } });
    expect(await creditPayment(d, found)).toEqual({ ok: false, reason: 'invalid_metadata' });
    expect(d.credit).not.toHaveBeenCalled();
  });

  it('un tipo de compra desconocido no se acredita', async () => {
    const { d } = deps({ '/checkout/preferences/pref-s': { metadata: { kind: 'otra', base_tokens: 10, amount_cents: 2000 } } });
    expect(await creditPayment(d, found)).toEqual({ ok: false, reason: 'invalid_metadata' });
    expect(d.credit).not.toHaveBeenCalled();
    expect(d.deliverSeasonal).not.toHaveBeenCalled();
  });

  it('si falla la entrega, el error se propaga (para que Mercado Pago reintente)', async () => {
    const { d } = deps(
      { '/checkout/preferences/pref-s': { metadata: seasonal } },
      { deliverSeasonal: vi.fn(async () => { throw new Error('rpc falló'); }) },
    );
    await expect(creditPayment(d, found)).rejects.toThrow('rpc falló');
  });
});
