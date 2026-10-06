const MERCADOPAGO_API_BASE = 'https://api.mercadopago.com';

/** GET a la API de Mercado Pago: null en 404, error en cualquier otra respuesta no exitosa. */
export function createMpGet(accessToken: string, fetchFn: typeof fetch = fetch) {
  return async function mpGet<T>(path: string): Promise<T | null> {
    const res = await fetchFn(`${MERCADOPAGO_API_BASE}${path}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Mercado Pago ${path} respondió ${res.status}`);
    return (await res.json()) as T;
  };
}
