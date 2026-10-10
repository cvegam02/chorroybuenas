/**
 * Deja correr una sola tarea a la vez: mientras una sigue en curso, las llamadas siguientes no lanzan
 * otra y reciben el resultado de la primera. Al terminar (bien o con error) se puede volver a lanzar.
 */
export function createSingleFlight<T>(): (run: () => Promise<T>) => Promise<T> {
  let inFlight: Promise<T> | null = null;

  return (run) => {
    if (inFlight) return inFlight;

    const started = run().finally(() => {
      inFlight = null;
    });
    inFlight = started;
    return started;
  };
}

/**
 * Lo mismo, por clave: mientras la tarea de una clave sigue en curso, pedirla otra vez no lanza otra y
 * recibe el resultado de la primera. Al terminar (bien o con error) esa clave se puede volver a lanzar.
 */
export function createKeyedSingleFlight<T>(): (key: string, run: () => Promise<T>) => Promise<T> {
  const inFlight = new Map<string, Promise<T>>();

  return (key, run) => {
    const started = inFlight.get(key);
    if (started) return started;

    const pending = run().finally(() => {
      inFlight.delete(key);
    });
    inFlight.set(key, pending);
    return pending;
  };
}
