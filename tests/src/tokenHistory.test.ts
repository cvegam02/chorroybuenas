import { describe, expect, it } from 'vitest';
import { buildTokenHistory, type TokenGift } from '../../src/utils/tokenHistory';
import type { TokenPurchase } from '../../src/repositories/TokenPricingRepository';

const purchase = (id: string, createdAt: string): TokenPurchase => ({
  id,
  pack_id: null,
  base_tokens: 10,
  bonus_tokens: 2,
  total_tokens: 12,
  amount_cents: 2000,
  payment_provider: 'mercadopago',
  payment_status: 'approved',
  created_at: createdAt,
});

const gift = (id: string, createdAt: string, amount = 3): TokenGift => ({
  id,
  amount,
  created_at: createdAt,
});

describe('historial de compras y regalos (contexto-negocio §7)', () => {
  it('mezcla compras y regalos del más reciente al más antiguo', () => {
    const history = buildTokenHistory(
      [purchase('c-nueva', '2026-10-05T10:00:00Z'), purchase('c-vieja', '2026-09-01T10:00:00Z')],
      [gift('r-medio', '2026-10-01T10:00:00Z'), gift('r-ultimo', '2026-10-06T10:00:00Z')],
    );

    expect(history.map((entry) => entry.id)).toEqual(['r-ultimo', 'c-nueva', 'r-medio', 'c-vieja']);
    expect(history.map((entry) => entry.kind)).toEqual(['gift', 'purchase', 'gift', 'purchase']);
  });

  it('con solo regalos devuelve los regalos', () => {
    const history = buildTokenHistory([], [gift('r1', '2026-10-06T10:00:00Z', 7)]);

    expect(history).toHaveLength(1);
    expect(history[0]).toEqual({
      kind: 'gift',
      id: 'r1',
      created_at: '2026-10-06T10:00:00Z',
      gift: { id: 'r1', amount: 7, created_at: '2026-10-06T10:00:00Z' },
    });
  });

  it('con solo compras devuelve las compras completas', () => {
    const only = purchase('c1', '2026-10-06T10:00:00Z');
    const history = buildTokenHistory([only], []);

    expect(history).toEqual([{ kind: 'purchase', id: 'c1', created_at: only.created_at, purchase: only }]);
  });

  it('sin compras ni regalos devuelve una lista vacía', () => {
    expect(buildTokenHistory([], [])).toEqual([]);
  });

  it('ordena por el momento real aunque las fechas vengan en formatos distintos', () => {
    const history = buildTokenHistory(
      [purchase('c1', '2026-10-06T12:00:00+00:00')],
      [gift('r1', '2026-10-06 18:00:00.123456+00'), gift('r2', '2026-10-06T06:00:00-06:00')],
    );

    // r2 ocurrió a las 12:00 UTC, igual que c1: en empate va primero la compra.
    expect(history.map((entry) => entry.id)).toEqual(['r1', 'c1', 'r2']);
  });

  it('no modifica las listas que recibe', () => {
    const purchases = [purchase('c-vieja', '2026-09-01T10:00:00Z'), purchase('c-nueva', '2026-10-05T10:00:00Z')];
    const gifts = [gift('r1', '2026-10-01T10:00:00Z')];

    buildTokenHistory(purchases, gifts);

    expect(purchases.map((p) => p.id)).toEqual(['c-vieja', 'c-nueva']);
    expect(gifts.map((g) => g.id)).toEqual(['r1']);
  });

  it('un regalo nunca trae motivo ni quién lo dio, aunque el servidor los mandara', () => {
    const leaky = { ...gift('r1', '2026-10-06T10:00:00Z'), reason: 'secreto', admin_id: 'x' } as TokenGift;
    const [entry] = buildTokenHistory([], [leaky]);

    expect(entry.kind).toBe('gift');
    expect(Object.keys(entry.kind === 'gift' ? entry.gift : {}).sort()).toEqual(['amount', 'created_at', 'id']);
  });
});
