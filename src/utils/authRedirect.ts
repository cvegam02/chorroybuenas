/** A dónde regresa el navegador después de entrar con Google. */

const DEFAULT_RETURN_PATH = '/dashboard';

/**
 * Dirección de regreso dentro del sitio. Solo acepta rutas propias («/comprar-tokens»); cualquier
 * otra cosa se cambia por Mi cuenta, para que el regreso nunca lleve a otro sitio.
 */
export function googleRedirectUrl(origin: string, returnPath?: string): string {
  const isOwnPath = returnPath !== undefined && returnPath.startsWith('/') && !returnPath.startsWith('//');
  return `${origin}${isOwnPath ? returnPath : DEFAULT_RETURN_PATH}`;
}
