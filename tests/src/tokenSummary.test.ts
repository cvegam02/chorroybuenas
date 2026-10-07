import { describe, expect, it } from 'vitest';
import { sumGiftTokens, summarizeTokens } from '../../src/utils/tokenHistory';

describe('resumen de tokens en Mi cuenta', () => {
  it('suma los tokens de todos los regalos', () => {
    expect(
      sumGiftTokens([
        { id: 'a', amount: 10, created_at: '2026-10-06T10:00:00Z' },
        { id: 'b', amount: 3, created_at: '2026-10-05T10:00:00Z' },
      ]),
    ).toBe(13);
    expect(sumGiftTokens([])).toBe(0);
  });

  it('los recibidos incluyen bienvenida, compras y regalos', () => {
    const summary = summarizeTokens({ initial: 5, purchased: 12, gifted: 10, spentRecorded: 2, balance: 25 });

    expect(summary.received).toBe(27);
    expect(summary.spent).toBe(2);
  });

  it('un regalo no se cuenta como gasto: sin usar la IA, lo gastado sigue en 0', () => {
    const summary = summarizeTokens({ initial: 5, purchased: 0, gifted: 10, spentRecorded: 0, balance: 15 });

    expect(summary.received).toBe(15);
    expect(summary.spent).toBe(0);
  });

  it('sin regalos el resumen es el de antes', () => {
    const summary = summarizeTokens({ initial: 5, purchased: 12, gifted: 0, spentRecorded: 4, balance: 13 });

    expect(summary).toEqual({ received: 17, spent: 4 });
  });

  it('si el gasto registrado se queda corto, usa la diferencia entre recibidos y saldo', () => {
    const summary = summarizeTokens({ initial: 5, purchased: 12, gifted: 10, spentRecorded: 1, balance: 20 });

    expect(summary.spent).toBe(7);
  });

  it('lo gastado nunca es negativo aunque el saldo supere lo recibido', () => {
    const summary = summarizeTokens({ initial: 5, purchased: 0, gifted: 0, spentRecorded: 0, balance: 40 });

    expect(summary.spent).toBe(0);
  });

  it('mientras el saldo no ha cargado, lo gastado es lo registrado', () => {
    const summary = summarizeTokens({ initial: 5, purchased: 12, gifted: 10, spentRecorded: 3, balance: null });

    expect(summary).toEqual({ received: 27, spent: 3 });
  });
});
