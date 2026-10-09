import { describe, expect, it, vi } from 'vitest';
import { createSingleFlight } from '../../src/utils/singleFlight';

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

describe('una sola generación a la vez (FEAT-27)', () => {
  it('una segunda llamada mientras la primera sigue en curso no lanza otra y recibe el mismo resultado', async () => {
    const once = createSingleFlight<string>();
    const work = deferred<string>();
    const run = vi.fn(() => work.promise);

    const first = once(run);
    const second = once(run);
    work.resolve('tableros');

    expect(run).toHaveBeenCalledTimes(1);
    expect(await first).toBe('tableros');
    expect(await second).toBe('tableros');
  });

  it('al terminar la primera, la siguiente llamada sí se lanza', async () => {
    const once = createSingleFlight<number>();
    const run = vi.fn(async () => 1);

    await once(run);
    await once(run);

    expect(run).toHaveBeenCalledTimes(2);
  });

  it('si la primera falla, las dos reciben el error y después se puede reintentar', async () => {
    const once = createSingleFlight<string>();
    const work = deferred<string>();
    const failing = vi.fn(() => work.promise);

    const first = once(failing);
    const second = once(failing);
    work.reject(new Error('sin red'));

    await expect(first).rejects.toThrow('sin red');
    await expect(second).rejects.toThrow('sin red');
    expect(await once(async () => 'ok')).toBe('ok');
  });
});
