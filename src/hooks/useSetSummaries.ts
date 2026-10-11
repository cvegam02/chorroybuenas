import { useCallback, useEffect, useState } from 'react';
import { loadSetSummaries, type SetSummary } from '../services/setSummaries';
import { logger } from '../utils/logger';

interface LoadedSummaries {
  key: string;
  /** null si la carga falló. */
  summaries: ReadonlyMap<string, SetSummary> | null;
}

interface SetSummariesState {
  /** El último resumen que se pudo cargar; null si aún no hay ninguno o si falló. */
  summaries: ReadonlyMap<string, SetSummary> | null;
  isLoading: boolean;
  hasError: boolean;
  retry: () => void;
}

/**
 * Resumen de las loterías de la cuenta para Mi cuenta. Se vuelve a pedir cuando cambia la lista de
 * loterías (al crear o eliminar una); mientras llega el nuevo se sigue mostrando el anterior.
 */
export const useSetSummaries = (userId: string | undefined, setIds: readonly string[]): SetSummariesState => {
  const [loaded, setLoaded] = useState<LoadedSummaries | null>(null);
  const [attempt, setAttempt] = useState(0);
  const key = userId ? `${userId}|${setIds.join(',')}|${attempt}` : null;

  useEffect(() => {
    if (!userId || key === null) return;
    let cancelled = false;
    loadSetSummaries(userId)
      .then((summaries) => {
        if (!cancelled) setLoaded({ key, summaries });
      })
      .catch((error) => {
        logger.error('Error loading set summaries:', error);
        if (!cancelled) setLoaded({ key, summaries: null });
      });
    return () => {
      cancelled = true;
    };
  }, [userId, key]);

  const retry = useCallback(() => setAttempt((current) => current + 1), []);

  const isCurrent = loaded !== null && loaded.key === key;
  return {
    summaries: loaded?.summaries ?? null,
    isLoading: !isCurrent,
    hasError: isCurrent && loaded.summaries === null,
    retry,
  };
};
