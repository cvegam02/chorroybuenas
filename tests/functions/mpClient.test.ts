import { describe, expect, it, vi } from 'vitest';
import { createMpGet } from '../../supabase/functions/_shared/mpClient.ts';

const fetchReturning = (status: number, body: unknown) =>
  vi.fn(async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;

describe('createMpGet', () => {
  it('devuelve el JSON y envía el token como Bearer', async () => {
    const fetchFn = fetchReturning(200, { id: 1 });
    expect(await createMpGet('TOKEN', fetchFn)('/v1/payments/1')).toEqual({ id: 1 });
    expect(fetchFn).toHaveBeenCalledWith('https://api.mercadopago.com/v1/payments/1', {
      headers: { Authorization: 'Bearer TOKEN' },
    });
  });

  it('devuelve null en 404', async () => {
    expect(await createMpGet('TOKEN', fetchReturning(404, {}))('/v1/payments/1')).toBe(null);
  });

  it('incluye el motivo que da Mercado Pago, para poder diagnosticar un 403', async () => {
    const body = { message: 'At least one policy returned UNAUTHORIZED.', error: 'forbidden', status: 403 };
    await expect(createMpGet('TOKEN', fetchReturning(403, body))('/merchant_orders/9'))
      .rejects.toThrow('Mercado Pago /merchant_orders/9 respondió 403: forbidden — At least one policy returned UNAUTHORIZED.');
  });

  it('acota el motivo y tolera cuerpos que no son JSON', async () => {
    const texto = vi.fn(async () => new Response('x'.repeat(1000), { status: 500 })) as unknown as typeof fetch;
    const error = await createMpGet('TOKEN', texto)('/v1/payments/1').catch((e: Error) => e);
    expect((error as Error).message.length).toBeLessThan(330);
    expect((error as Error).message).toContain('respondió 500: xxx');
  });

  it('lanza en errores del servidor, sin incluir el token', async () => {
    const call = createMpGet('TOKEN', fetchReturning(503, {}))('/v1/payments/1');
    await expect(call).rejects.toThrow('Mercado Pago /v1/payments/1 respondió 503');
    await expect(call).rejects.not.toThrow('TOKEN');
  });
});
