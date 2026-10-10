/**
 * Cargador que pide cada clave una sola vez: las peticiones simultáneas de la misma clave
 * comparten el mismo resultado. Un fallo (error o `null`) no se guarda, para que se pueda reintentar.
 */
export function createOnceLoader<T>(): (key: string, load: () => Promise<T | null>) => Promise<T | null> {
  const loads = new Map<string, Promise<T | null>>();

  return (key, load) => {
    const started = loads.get(key);
    if (started) return started;

    const pending = load().then(
      (value) => {
        if (value === null) loads.delete(key);
        return value;
      },
      (error: unknown) => {
        loads.delete(key);
        throw error;
      },
    );
    loads.set(key, pending);
    return pending;
  };
}
