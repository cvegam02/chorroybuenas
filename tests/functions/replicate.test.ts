import { describe, expect, it, vi } from 'vitest';
import {
  createPrediction, firstOutput, runCharged, waitForPrediction, type ReplicateDeps,
} from '../../supabase/functions/_shared/replicate.ts';

const res = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

function deps(responses: Response[]): ReplicateDeps & { calls: string[]; clock: { t: number } } {
  const calls: string[] = [];
  const clock = { t: 0 };
  return {
    calls,
    clock,
    fetchFn: (async (url: string | URL | Request) => {
      calls.push(String(url));
      const next = responses.shift();
      if (!next) throw new Error('sin más respuestas simuladas');
      return next;
    }) as typeof fetch,
    sleep: async (ms: number) => { clock.t += ms; },
    now: () => clock.t,
  };
}

describe('createPrediction', () => {
  it('devuelve la predicción creada', async () => {
    const d = deps([res(201, { id: 'p1', status: 'starting' })]);
    expect(await createPrediction(d, 'key', {})).toMatchObject({ id: 'p1' });
  });

  it('reintenta en 429 y respeta retry_after con tope de 30 s', async () => {
    const d = deps([res(429, { retry_after: 999 }), res(201, { id: 'p1', status: 'starting' })]);
    await createPrediction(d, 'key', {});
    expect(d.calls).toHaveLength(2);
    expect(d.clock.t).toBe(30_000);
  });

  it('sin retry_after espera 10 s', async () => {
    const d = deps([res(429, {}), res(201, { id: 'p1', status: 'starting' })]);
    await createPrediction(d, 'key', {});
    expect(d.clock.t).toBe(10_000);
  });

  it('se rinde tras maxRetries 429 seguidos', async () => {
    const d = deps([res(429, {}), res(429, {}), res(429, {})]);
    await expect(createPrediction(d, 'key', {}, 2)).rejects.toThrow('AI_BUSY');
    expect(d.calls).toHaveLength(3);
  });

  it('propaga el detalle de un error de la API', async () => {
    const d = deps([res(422, { detail: 'bad input' })]);
    await expect(createPrediction(d, 'key', {})).rejects.toThrow('Replicate API (422): bad input');
  });

  it('tolera un error sin cuerpo JSON', async () => {
    const d = deps([new Response('boom', { status: 500, statusText: 'Server Error' })]);
    await expect(createPrediction(d, 'key', {})).rejects.toThrow('Replicate API (500)');
  });
});

describe('waitForPrediction', () => {
  it('hace polling hasta succeeded', async () => {
    const d = deps([res(200, { id: 'p1', status: 'processing' }), res(200, { id: 'p1', status: 'succeeded', output: 'https://out' })]);
    const p = await waitForPrediction(d, 'key', { id: 'p1', status: 'starting' });
    expect(p.status).toBe('succeeded');
    expect(d.clock.t).toBe(6000);
  });

  it.each(['succeeded', 'failed', 'canceled'])('devuelve de inmediato si ya está en %s', async (status) => {
    const d = deps([]);
    expect((await waitForPrediction(d, 'key', { id: 'p1', status })).status).toBe(status);
    expect(d.calls).toHaveLength(0);
  });

  it('al exceder el timeout cancela la predicción y lanza AI_TIMEOUT', async () => {
    const d = deps([
      res(200, { id: 'p1', status: 'processing' }),
      res(200, { id: 'p1', status: 'processing' }),
      res(200, { id: 'p1', status: 'canceled' }),
    ]);
    await expect(waitForPrediction(d, 'key', { id: 'p1', status: 'starting' }, { timeoutMs: 5000, intervalMs: 3000 }))
      .rejects.toThrow('AI_TIMEOUT');
    expect(d.calls.at(-1)).toContain('/predictions/p1/cancel');
  });

  it('lanza AI_TIMEOUT aunque la cancelación falle', async () => {
    const d = deps([res(200, { id: 'p1', status: 'processing' }), res(200, { id: 'p1', status: 'processing' })]);
    await expect(waitForPrediction(d, 'key', { id: 'p1', status: 'starting' }, { timeoutMs: 5000, intervalMs: 3000 }))
      .rejects.toThrow('AI_TIMEOUT');
  });

  it('un error de polling se propaga', async () => {
    const d = deps([res(500, { detail: 'boom' })]);
    await expect(waitForPrediction(d, 'key', { id: 'p1', status: 'starting' })).rejects.toThrow('Replicate poll (500)');
  });
});

describe('firstOutput', () => {
  it('acepta string o arreglo', () => {
    expect(firstOutput({ id: 'p', status: 'succeeded', output: 'a' })).toBe('a');
    expect(firstOutput({ id: 'p', status: 'succeeded', output: ['b', 'c'] })).toBe('b');
  });
  it.each([[[]], [null], [undefined], ['']])('lanza si la salida es %j', (output) => {
    expect(() => firstOutput({ id: 'p', status: 'succeeded', output })).toThrow('AI_EMPTY_OUTPUT');
  });
});

describe('runCharged', () => {
  it('cobra, ejecuta y no reembolsa si todo sale bien', async () => {
    const refund = vi.fn(async () => {});
    const out = await runCharged({ spend: async () => 'u1', refund, run: async () => 'ok' });
    expect(out).toBe('ok');
    expect(refund).not.toHaveBeenCalled();
  });

  it('reembolsa si la ejecución falla y relanza el error original', async () => {
    const refund = vi.fn(async () => {});
    await expect(runCharged({ spend: async () => 'u1', refund, run: async () => { throw new Error('AI_TIMEOUT'); } }))
      .rejects.toThrow('AI_TIMEOUT');
    expect(refund).toHaveBeenCalledWith('u1');
  });

  it('no ejecuta ni reembolsa si el cobro falla', async () => {
    const refund = vi.fn(async () => {});
    const run = vi.fn(async () => 'ok');
    await expect(runCharged({ spend: async () => { throw new Error('INSUFFICIENT_TOKENS'); }, refund, run }))
      .rejects.toThrow('INSUFFICIENT_TOKENS');
    expect(run).not.toHaveBeenCalled();
    expect(refund).not.toHaveBeenCalled();
  });

  it('si el reembolso falla, avisa y relanza el error original de la ejecución', async () => {
    const onRefundError = vi.fn();
    await expect(runCharged({
      spend: async () => 'u1',
      refund: async () => { throw new Error('db caída'); },
      run: async () => { throw new Error('AI_ERROR'); },
      onRefundError,
    })).rejects.toThrow('AI_ERROR');
    expect(onRefundError).toHaveBeenCalledWith('u1', expect.any(Error));
  });
});
