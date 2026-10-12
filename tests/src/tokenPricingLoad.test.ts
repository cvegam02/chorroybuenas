import { beforeEach, describe, expect, it, vi } from 'vitest';

const packsQuery = vi.hoisted(() => ({
  result: { data: null, error: null } as {
    data: { id: string; base_tokens: number; bonus_tokens: number; price_cents: number }[] | null;
    error: { message: string } | null;
  },
}));

vi.mock('../../src/utils/supabaseClient', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({ order: async () => packsQuery.result }),
      }),
    }),
  },
}));

import { TokenPricingRepository } from '../../src/repositories/TokenPricingRepository';

const PACK = { id: 'p1', base_tokens: 10, bonus_tokens: 2, price_cents: 2000 };

describe('paquetes de tokens leídos de la base (FEAT-33, US A8)', () => {
  beforeEach(() => {
    packsQuery.result = { data: null, error: null };
  });

  it('devuelve los paquetes activos tal como están guardados', async () => {
    packsQuery.result = { data: [PACK], error: null };
    expect(await TokenPricingRepository.getPacksOrNull()).toEqual([PACK]);
  });

  it('si la consulta falla devuelve null: no hay paquetes de respaldo con precios supuestos', async () => {
    packsQuery.result = { data: null, error: { message: 'sin red' } };
    expect(await TokenPricingRepository.getPacksOrNull()).toBeNull();
  });

  it('sin paquetes activos devuelve una lista vacía, que no es un error', async () => {
    packsQuery.result = { data: [], error: null };
    expect(await TokenPricingRepository.getPacksOrNull()).toEqual([]);
  });

  it('ya no existen las lecturas con respaldo', () => {
    expect('getPacks' in TokenPricingRepository).toBe(false);
    expect('getPricing' in TokenPricingRepository).toBe(false);
  });
});
