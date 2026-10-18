import { describe, expect, it } from 'vitest';
import { AI_BATCH_CONCURRENCY, cardsToGenerate, cardsToUse, retryWhenBusy, runWithLimit } from '../../src/utils/aiCardBatch';

const card = (id: string, chosen: string | null, path = `${id}.webp`) => ({
  id,
  chosenAttemptId: chosen,
  attempts: chosen ? [{ id: chosen, path }] : [],
});

describe('generar las que faltan (FEAT-50, US A4)', () => {
  it('solo toma las cartas sin intento elegido que no se están generando', () => {
    const cards = [card('a', 'x'), card('b', null), card('c', null), card('d', null)];
    expect(cardsToGenerate(cards, new Set(['c'])).map((c) => c.id)).toEqual(['b', 'd']);
  });

  it('nunca corre más trabajos a la vez que el límite, y un fallo no detiene a los demás', async () => {
    let running = 0;
    let peak = 0;
    const done: number[] = [];
    await runWithLimit([1, 2, 3, 4, 5, 6, 7], 3, async (n) => {
      running += 1;
      peak = Math.max(peak, running);
      await new Promise((resolve) => setTimeout(resolve, 5));
      running -= 1;
      if (n === 2) throw new Error('falla');
      done.push(n);
    });
    expect(peak).toBe(3);
    expect(done.sort()).toEqual([1, 3, 4, 5, 6, 7]);
  });

  it('se puede detener: lo que no empezó ya no corre', async () => {
    const started: number[] = [];
    let stop = false;
    await runWithLimit(
      [1, 2, 3, 4],
      1,
      async (n) => {
        started.push(n);
        if (n === 2) stop = true;
      },
      () => stop,
    );
    expect(started).toEqual([1, 2]);
  });
});

describe('usar estas cartas (FEAT-50, US A4)', () => {
  it('pasa los intentos elegidos en el orden de la lista y cuenta las que faltan', () => {
    const cards = [card('a', 'a1'), card('b', null), card('c', 'c1')];
    const { items, missing } = cardsToUse(cards);
    expect(items.map((item) => [item.card.id, item.path])).toEqual([
      ['a', 'a.webp'],
      ['c', 'c.webp'],
    ]);
    expect(missing).toBe(1);
  });

  it('una carta cuyo elegido no está entre sus intentos cuenta como faltante', () => {
    expect(cardsToUse([{ id: 'a', chosenAttemptId: 'z', attempts: [] }])).toEqual({ items: [], missing: 1 });
  });
});

describe('ritmo de la cola (FEAT-50, US A4)', () => {
  it('genera 8 cartas a la vez', () => {
    expect(AI_BATCH_CONCURRENCY).toBe(8);
  });

  it('si Replicate está ocupado, espera y reintenta; otro error no se reintenta', async () => {
    const waits: number[] = [];
    const sleep = async (ms: number) => void waits.push(ms);
    const answers = [{ ok: false, code: 'AI_BUSY' }, { ok: true }];
    const busyThenOk = await retryWhenBusy(async () => answers.shift() as { ok: boolean; code?: string }, sleep);
    expect(busyThenOk).toEqual({ ok: true });
    expect(waits).toEqual([20_000]);

    let calls = 0;
    const other = await retryWhenBusy(async () => {
      calls += 1;
      return { ok: false, code: 'NSFW_FILTER' };
    }, sleep);
    expect(other).toEqual({ ok: false, code: 'NSFW_FILTER' });
    expect(calls).toBe(1);
  });

  it('se rinde tras 2 reintentos y devuelve el último error', async () => {
    let calls = 0;
    const result = await retryWhenBusy(async () => {
      calls += 1;
      return { ok: false, code: 'AI_BUSY' };
    }, async () => undefined);
    expect(result).toEqual({ ok: false, code: 'AI_BUSY' });
    expect(calls).toBe(3);
  });
});
