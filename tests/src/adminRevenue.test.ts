import { describe, expect, it } from 'vitest';
import { summarizeRevenue } from '../../src/utils/adminRevenue';

const tokens = (...amounts: (number | null)[]) => amounts.map((amount_cents) => ({ amount_cents }));
const seasonal = (amount_cents: number, status = 'approved') => ({ amount_cents, status });

describe('resumen de ingresos del panel (FEAT-17, C5)', () => {
  it('el total suma compras de tokens y de temporada', () => {
    expect(summarizeRevenue(tokens(2000, 5000), [seasonal(8000), seasonal(4900)])).toEqual({
      tokensCents: 7000,
      seasonalCents: 12900,
      totalCents: 19900,
      tokensCount: 2,
      seasonalCount: 2,
      totalCount: 4,
    });
  });

  it.each(['pending', 'repeated', 'refunded'])('una compra de temporada %s no cuenta como ingreso', (status) => {
    const summary = summarizeRevenue(tokens(2000), [seasonal(8000), seasonal(4900, status)]);

    expect(summary.seasonalCents).toBe(8000);
    expect(summary.seasonalCount).toBe(1);
    expect(summary.totalCents).toBe(10000);
    expect(summary.totalCount).toBe(2);
  });

  it('sin ventas de temporada, el total es el de tokens', () => {
    expect(summarizeRevenue(tokens(2000, 3000), [])).toMatchObject({
      tokensCents: 5000, seasonalCents: 0, totalCents: 5000, totalCount: 2,
    });
  });

  it('sin ninguna compra, todo es cero', () => {
    expect(summarizeRevenue([], [])).toEqual({
      tokensCents: 0, seasonalCents: 0, totalCents: 0, tokensCount: 0, seasonalCount: 0, totalCount: 0,
    });
  });

  it('una compra de tokens sin monto cuenta como compra pero suma cero', () => {
    expect(summarizeRevenue(tokens(2000, null), [])).toMatchObject({ tokensCents: 2000, tokensCount: 2 });
  });
});
