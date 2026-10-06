/* eslint-disable no-console -- único punto del frontend autorizado a escribir en consola */

/** Registro del frontend: los avisos solo aparecen en desarrollo; los errores siempre. */
export const logger = {
  warn: (...args: unknown[]): void => {
    if (!import.meta.env.PROD) console.warn(...args);
  },
  error: (...args: unknown[]): void => {
    console.error(...args);
  },
};
