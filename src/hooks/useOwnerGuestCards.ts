import { useCallback, useEffect, useRef, useState } from 'react';
import { GuestLoteriaRepository } from '../repositories/GuestLoteriaRepository';
import { LoteriaInviteRepository } from '../repositories/LoteriaInviteRepository';
import type { LoteriaMember } from '../utils/guestCards';
import { logger } from '../utils/logger';

export interface OwnerGuestCards {
  /** Quiénes participan, para decir quién subió cada carta. */
  members: ReadonlyMap<string, LoteriaMember>;
  /** Cartas de invitados que llegaron desde la última visita o durante esta («Nueva»). */
  newCardIds: ReadonlySet<string>;
  /** Vuelve a pedir quiénes participan y las cartas nuevas (al llegar una carta de un invitado). */
  refresh: () => void;
}

/**
 * Lo que el dueño ve de sus invitados en U2 (FEAT-56, US B4; migración 066). Al abrir la lotería se piden sus
 * cartas nuevas y el contador «N fotos nuevas» se borra en la base; en pantalla siguen marcadas en esta visita.
 */
export const useOwnerGuestCards = (setId: string | undefined, enabled: boolean): OwnerGuestCards => {
  const [members, setMembers] = useState<ReadonlyMap<string, LoteriaMember>>(new Map());
  const [newCardIds, setNewCardIds] = useState<ReadonlySet<string>>(new Set());
  // La lotería que se muestra: lo que llega tarde de otra lotería no se aplica
  const currentSetId = useRef(setId);
  currentSetId.current = setId;

  const refresh = useCallback(() => {
    if (!setId || !enabled) return;
    Promise.all([GuestLoteriaRepository.getMembers(setId), LoteriaInviteRepository.seeGuestCards(setId)])
      .then(([nextMembers, seenIds]) => {
        if (currentSetId.current !== setId) return;
        setMembers(nextMembers);
        if (seenIds.length > 0) setNewCardIds((prev) => new Set([...prev, ...seenIds]));
      })
      .catch((err) => logger.error('Error loading loteria guests:', err));
  }, [setId, enabled]);

  useEffect(() => {
    setMembers(new Map());
    setNewCardIds(new Set());
  }, [setId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { members, newCardIds, refresh };
};
