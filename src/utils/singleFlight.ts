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
