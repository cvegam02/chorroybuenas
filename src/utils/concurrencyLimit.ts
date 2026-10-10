/**
 * Deja correr a la vez, como mucho, `max` tareas; las demás esperan su turno en orden de llegada.
 * Una tarea que falla suelta su lugar igual que una que termina bien.
 */
export function createConcurrencyLimit(max: number): <T>(run: () => Promise<T>) => Promise<T> {
  let running = 0;
  const waiting: Array<() => void> = [];

  const release = () => {
    running--;
    waiting.shift()?.();
  };

  return async (run) => {
    if (running >= max) await new Promise<void>((resolve) => waiting.push(resolve));
    running++;
    try {
      return await run();
    } finally {
      release();
    }
  };
}
