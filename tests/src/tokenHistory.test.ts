import { describe, expect, it } from 'vitest';
import {
  buildTokenHistory,
  latestTokenMovements,
  type SeasonalHistoryPurchase,
  type TokenGift,
} from '../../src/utils/tokenHistory';
import type { TokenPurchase } from '../../src/repositories/TokenPricingRepository';
import es from '../../src/locales/es/translation.json';
import en from '../../src/locales/en/translation.json';

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

const seasonal = (id: string, createdAt: string, status = 'approved'): SeasonalHistoryPurchase => ({
  id,
  name_es: 'Día de Muertos',
  name_en: 'Day of the Dead',
  amount_cents: 4900,
  payment_provider: 'mercadopago',
  status,
  created_at: createdAt,
});

describe('historial con compras de loterías de temporada (FEAT-17, C4)', () => {
  it('mezcla compras de tokens, de temporada y regalos por fecha', () => {
    const history = buildTokenHistory(
      [purchase('tokens', '2026-10-03T10:00:00Z')],
      [gift('regalo', '2026-10-05T10:00:00Z')],
      [seasonal('temporada-nueva', '2026-10-06T10:00:00Z'), seasonal('temporada-vieja', '2026-10-01T10:00:00Z')],
    );

    expect(history.map((entry) => entry.id)).toEqual(['temporada-nueva', 'regalo', 'tokens', 'temporada-vieja']);
    expect(history.map((entry) => entry.kind)).toEqual(['seasonal', 'gift', 'purchase', 'seasonal']);
  });

  it('la compra de temporada conserva el nombre de la lotería y lo que se pagó', () => {
    const [entry] = buildTokenHistory([], [], [seasonal('s1', '2026-10-06T10:00:00Z')]);

    expect(entry).toEqual({
      kind: 'seasonal',
      id: 's1',
      created_at: '2026-10-06T10:00:00Z',
      seasonal: seasonal('s1', '2026-10-06T10:00:00Z'),
    });
  });

  it.each(['pending', 'repeated', 'refunded'])(
    'una compra de temporada %s no aparece como compra hecha', (status) => {
      const history = buildTokenHistory([], [], [
        seasonal('hecha', '2026-10-06T10:00:00Z'),
        seasonal('otra', '2026-10-05T10:00:00Z', status),
      ]);

      expect(history.map((entry) => entry.id)).toEqual(['hecha']);
    });

  it('en empate de fecha: tokens, luego temporada, luego regalo', () => {
    const at = '2026-10-06T10:00:00Z';
    const history = buildTokenHistory([purchase('t', at)], [gift('r', at)], [seasonal('s', at)]);

    expect(history.map((entry) => entry.kind)).toEqual(['purchase', 'seasonal', 'gift']);
  });

  it('sin el tercer argumento se comporta igual que antes', () => {
    const history = buildTokenHistory([purchase('t', '2026-10-06T10:00:00Z')], []);

    expect(history.map((entry) => entry.kind)).toEqual(['purchase']);
  });
});

describe('últimos movimientos de tokens en Mi cuenta (FEAT-35, US A4)', () => {
  const seasonal = (id: string, createdAt: string): SeasonalHistoryPurchase => ({
    id,
    name_es: 'Lotería de Halloween',
    name_en: null,
    amount_cents: 9900,
    payment_provider: 'mercadopago',
    status: 'approved',
    created_at: createdAt,
  });

  it('trae los cuatro más recientes, en el mismo orden del historial', () => {
    const history = buildTokenHistory(
      [1, 2, 3].map((day) => purchase(`c${day}`, `2026-10-0${day}T10:00:00Z`)),
      [4, 5, 6].map((day) => gift(`r${day}`, `2026-10-0${day}T10:00:00Z`)),
    );

    expect(latestTokenMovements(history).map((entry) => entry.id)).toEqual(['r6', 'r5', 'r4', 'c3']);
  });

  it('deja fuera las compras de temáticas: no mueven tokens', () => {
    const history = buildTokenHistory(
      [purchase('c1', '2026-10-01T10:00:00Z')],
      [gift('r1', '2026-10-02T10:00:00Z')],
      [seasonal('t1', '2026-10-03T10:00:00Z')],
    );

    expect(latestTokenMovements(history).map((entry) => entry.kind)).toEqual(['gift', 'purchase']);
  });

  it('deja fuera las compras que no se acreditaron', () => {
    const history = buildTokenHistory(
      [
        { ...purchase('pendiente', '2026-10-04T10:00:00Z'), payment_status: 'pending' },
        { ...purchase('rechazada', '2026-10-03T10:00:00Z'), payment_status: 'rejected' },
        { ...purchase('aprobada', '2026-10-02T10:00:00Z'), payment_status: 'approved' },
        { ...purchase('antigua', '2026-10-01T10:00:00Z'), payment_status: null },
      ],
      [],
    );

    expect(latestTokenMovements(history).map((entry) => entry.id)).toEqual(['aprobada', 'antigua']);
  });

  it('respeta el límite que se le pida y no modifica el historial', () => {
    const history = buildTokenHistory([purchase('c1', '2026-10-01T10:00:00Z')], [gift('r1', '2026-10-02T10:00:00Z')]);
    const before = [...history];

    expect(latestTokenMovements(history, 1).map((entry) => entry.id)).toEqual(['r1']);
    expect(latestTokenMovements([])).toEqual([]);
    expect(history).toEqual(before);
  });
});

describe('textos de «Mis temáticas» y «Movimientos de tokens» (FEAT-35, US A4)', () => {
  const keysOf = (value: Record<string, unknown>): string[] => Object.keys(value).sort();

  it('son los mismos en español y en inglés', () => {
    expect(keysOf(en.dashboard.movements)).toEqual(keysOf(es.dashboard.movements));
    expect(keysOf(en.dashboard.seasonal)).toEqual(keysOf(es.dashboard.seasonal));
  });

  it('una temática sin pagar dice «Esperando pago»', () => {
    expect(es.dashboard.seasonal.pending).toBe('Esperando pago');
  });
});
