import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../utils/supabaseClient';
import { AVATAR_BUCKET, resolveAvatarSource } from '../utils/avatar';
import { logger } from '../utils/logger';

const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hora; se renueva en cada montaje

/** URL lista para <img> del avatar del usuario, o null si no tiene (o no se pudo firmar). */
export function useAvatarUrl(user: User | null): string | null {
  const [url, setUrl] = useState<string | null>(null);

  const source = resolveAvatarSource(user?.user_metadata);
  const kind = source?.kind ?? null;
  const value = source ? (source.kind === 'path' ? source.path : source.url) : null;
  // Cambia cuando el usuario sube un avatar nuevo a la misma ruta: fuerza volver a firmar.
  const version = user?.updated_at ?? null;

  useEffect(() => {
    if (!kind || !value) {
      setUrl(null);
      return;
    }
    if (kind === 'url') {
      setUrl(value);
      return;
    }
    let cancelled = false;
    supabase.storage
      .from(AVATAR_BUCKET)
      .createSignedUrl(value, SIGNED_URL_TTL_SECONDS)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) logger.error('No se pudo firmar la URL del avatar:', error.message);
        setUrl(data?.signedUrl ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [kind, value, version]);

  return url;
}
