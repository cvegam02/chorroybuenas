import { useCallback, useEffect, useRef, useState } from 'react';
import { LoteriaInviteRepository } from '../repositories/LoteriaInviteRepository';
import { logger } from '../utils/logger';

/** Cómo se está compartiendo una lotería colectiva: si el enlace sigue abierto y cuántos invitados tiene. */
export interface LoteriaSharing {
  isOpen: boolean;
  inviteeCount: number;
}

/** Espera antes de volver a contar cuando llegan fotos de invitados: una subida en lote cuenta una sola vez. */
const REFRESH_SOON_MS = 1500;

/**
 * El estado de lo compartido para el botón «Compartida · N» de U2 (FEAT-57, US A4). Null mientras carga o si la
 * lotería no tiene enlace. `refresh` lo vuelve a leer al momento (después de cerrar el enlace o quitar a alguien);
 * `refreshSoon`, un poco después y una sola vez aunque se llame muchas (fotos de invitados que llegan en vivo).
 */
export const useLoteriaSharing = (setId: string | undefined, isCollective: boolean) => {
  const [sharing, setSharing] = useState<LoteriaSharing | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!setId || !isCollective) {
      setSharing(null);
      return;
    }
    let cancelled = false;
    Promise.all([LoteriaInviteRepository.get(setId), LoteriaInviteRepository.listInvitees(setId)])
      .then(([invite, invitees]) => {
        if (!cancelled) setSharing(invite ? { isOpen: invite.isOpen, inviteeCount: invitees.length } : null);
      })
      .catch((err) => logger.error('Error loading loteria sharing:', err));
    return () => {
      cancelled = true;
    };
  }, [setId, isCollective, version]);

  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  const soonTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshSoon = useCallback(() => {
    if (soonTimer.current) clearTimeout(soonTimer.current);
    soonTimer.current = setTimeout(() => {
      soonTimer.current = null;
      setVersion((v) => v + 1);
    }, REFRESH_SOON_MS);
  }, []);
  useEffect(() => () => {
    if (soonTimer.current) clearTimeout(soonTimer.current);
  }, []);

  return { sharing, refresh, refreshSoon };
};
