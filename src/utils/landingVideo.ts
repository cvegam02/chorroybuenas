/** Página de inicio (FEAT-32, pantalla P1): qué video recibe cada navegador. */

/**
 * Safari reproduce WebM pero no pinta su fondo transparente, así que recibe solo el MP4, que trae el
 * fondo naranja. En iPhone y iPad todos los navegadores usan el motor de Safari.
 */
export function playsMp4Only(userAgent: string): boolean {
  if (/iPhone|iPad|iPod/.test(userAgent)) return true;
  return /Safari/.test(userAgent) && !/Chrome|Chromium|Android|Edg|OPR/.test(userAgent);
}
