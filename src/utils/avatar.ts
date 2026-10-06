export const AVATAR_BUCKET = 'card-images';

export type AvatarSource = { kind: 'path'; path: string } | { kind: 'url'; url: string } | null;

const LEGACY_SIGNED_URL_RE = new RegExp(`/storage/v1/object/sign/${AVATAR_BUCKET}/([^?]+)`);

/**
 * De dónde sale el avatar de un usuario:
 * - avatar_path: ruta en el bucket privado (se firma al mostrar)
 * - avatar_url firmada antigua de este bucket: se extrae su ruta para volver a firmarla
 * - avatar_url externa (Google OAuth): se usa directamente
 */
export function resolveAvatarSource(metadata: Record<string, unknown> | undefined): AvatarSource {
  const path = metadata?.avatar_path;
  if (typeof path === 'string' && path.length > 0) return { kind: 'path', path };

  const url = metadata?.avatar_url;
  if (typeof url !== 'string' || url.length === 0) return null;

  const legacy = url.match(LEGACY_SIGNED_URL_RE);
  if (legacy) {
    try {
      return { kind: 'path', path: decodeURIComponent(legacy[1]) };
    } catch {
      // Ruta mal codificada: se trata como una URL cualquiera.
    }
  }

  return { kind: 'url', url };
}
