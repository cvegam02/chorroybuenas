import { describe, expect, it, vi } from 'vitest';
import { createConcurrencyLimit } from '../../src/utils/concurrencyLimit';
import { createKeyedSingleFlight } from '../../src/utils/singleFlight';

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

/** Deja correr lo que ya está encolado en promesas. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('tope de tareas a la vez (FEAT-29: las descargas de imágenes no saturan Storage)', () => {
  it('nunca corren más tareas que el tope, y las demás esperan su turno', async () => {
    const limit = createConcurrencyLimit(2);
    const works = Array.from({ length: 5 }, () => deferred<number>());
    let running = 0;
    let mostRunning = 0;

    const results = works.map((work, index) =>
      limit(async () => {
        running++;
        mostRunning = Math.max(mostRunning, running);
        const value = await work.promise;
        running--;
        return value + index;
      })
    );

    await settle();
    expect(running).toBe(2);

    for (const work of works) {
      work.resolve(10);
      await settle();
    }

    expect(await Promise.all(results)).toEqual([10, 11, 12, 13, 14]);
    expect(mostRunning).toBe(2);
  });

  it('una tarea que falla suelta su lugar y no detiene a las demás', async () => {
    const limit = createConcurrencyLimit(1);

    const failed = limit(async () => {
      throw new Error('falló');
    });
    const next = limit(async () => 'sigue');

    await expect(failed).rejects.toThrow('falló');
    expect(await next).toBe('sigue');
  });
});

describe('una sola tarea por clave a la vez (FEAT-29)', () => {
  it('pedir la misma clave mientras sigue en curso no lanza otra tarea', async () => {
    const once = createKeyedSingleFlight<string>();
    const work = deferred<string>();
    const run = vi.fn(() => work.promise);

    const first = once('a.jpg', run);
    const second = once('a.jpg', run);
    work.resolve('imagen');

    expect(await first).toBe('imagen');
    expect(await second).toBe('imagen');
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('claves distintas corren cada una por su cuenta', async () => {
    const once = createKeyedSingleFlight<string>();
    const run = vi.fn(async () => 'imagen');

    await Promise.all([once('a.jpg', run), once('b.jpg', run)]);

    expect(run).toHaveBeenCalledTimes(2);
  });

  it('al terminar, bien o con error, la clave se puede volver a pedir', async () => {
    const once = createKeyedSingleFlight<string>();
    const run = vi.fn()
      .mockRejectedValueOnce(new Error('falló'))
      .mockResolvedValueOnce('imagen');

    await expect(once('a.jpg', run)).rejects.toThrow('falló');
    expect(await once('a.jpg', run)).toBe('imagen');
    expect(run).toHaveBeenCalledTimes(2);
  });
});
