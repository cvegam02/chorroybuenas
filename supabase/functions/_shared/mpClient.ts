const MERCADOPAGO_API_BASE = 'https://api.mercadopago.com';

const MAX_REASON_CHARS = 250;

/** Motivo del error según el cuerpo de la respuesta de MP (solo para logs del servidor). */
async function describeError(res: Response): Promise<string> {
  const text = await res.text().catch(() => '');
  if (!text) return '';
  let reason = text;
  try {
    const body = JSON.parse(text) as { error?: unknown; message?: unknown };
    const parts = [body.error, body.message].filter((p): p is string => typeof p === 'string' && p.length > 0);
    if (parts.length > 0) reason = parts.join(' — ');
  } catch {
    // cuerpo que no es JSON: se usa el texto tal cual
  }
  return `: ${reason.slice(0, MAX_REASON_CHARS)}`;
}

/** GET a la API de Mercado Pago: null en 404, error en cualquier otra respuesta no exitosa. */
export function createMpGet(accessToken: string, fetchFn: typeof fetch = fetch) {
  return async function mpGet<T>(path: string): Promise<T | null> {
    const res = await fetchFn(`${MERCADOPAGO_API_BASE}${path}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Mercado Pago ${path} respondió ${res.status}${await describeError(res)}`);
    return (await res.json()) as T;
  };
}
