const ALLOW_HEADERS = 'authorization, x-client-info, apikey, content-type';

export function parseAllowedOrigins(raw: string | undefined): string[] {
  return (raw ?? '')
    .split(',')
    .map((o) => o.trim().replace(/\/$/, ''))
    .filter((o) => o.length > 0);
}

/**
 * CORS por lista blanca (secret ALLOWED_ORIGINS). Un origen no permitido recibe como
 * Allow-Origin el primero de la lista, así que el navegador bloquea la respuesta.
 */
export function buildCorsHeaders(origin: string | null, allowedOrigins: string[]): Record<string, string> {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': ALLOW_HEADERS,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
    Vary: 'Origin',
  };
  if (allowedOrigins.length === 0) return headers;
  const normalized = origin?.replace(/\/$/, '') ?? '';
  headers['Access-Control-Allow-Origin'] = allowedOrigins.includes(normalized) ? normalized : allowedOrigins[0];
  return headers;
}
