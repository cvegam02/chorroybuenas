const toHex = (byte: number): string => byte.toString(16).padStart(2, '0');

/**
 * Identificador nuevo para una carta (UUID v4, como lo pide la tabla de cartas).
 * `crypto.randomUUID` solo existe en páginas seguras (https o localhost). Al abrir el servidor local desde
 * el teléfono, por http y la dirección de la red, no está, y sin esto no se podía agregar ninguna carta
 * (FEAT-39, US A3). `crypto.getRandomValues` sí está en cualquier página.
 */
export const newUuid = (): string => {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();

  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const hex = Array.from(bytes, (byte, index) => {
    if (index === 6) return toHex((byte & 0x0f) | 0x40); // versión 4
    if (index === 8) return toHex((byte & 0x3f) | 0x80); // variante RFC 4122
    return toHex(byte);
  });
  return [
    hex.slice(0, 4).join(''),
    hex.slice(4, 6).join(''),
    hex.slice(6, 8).join(''),
    hex.slice(8, 10).join(''),
    hex.slice(10, 16).join(''),
  ].join('-');
};
