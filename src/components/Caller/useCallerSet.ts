import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSetContext } from '../../contexts/SetContext';
import { useCards } from '../../hooks/useCards';
import { SetRepository, type LoteriaSet } from '../../repositories/SetRepository';
import type { Card } from '../../types';
import { logger } from '../../utils/logger';

export type CallerSetState =
  | { status: 'loading' }
  | { status: 'notFound' }
  | { status: 'error' }
  | { status: 'ready'; set: LoteriaSet; cards: Card[] };

/**
 * La lotería que se va a cantar y sus cartas, igual que la carga la página de la lotería (U2).
 * Una lotería ajena no llega: la base solo devuelve las del dueño (§12), y se ve como «no encontrada».
 */
export const useCallerSet = (setId: string | undefined): CallerSetState => {
  const { user } = useAuth();
  const { sets, currentSetId, setCurrentSetId } = useSetContext();
  const { cards, isLoading: cardsLoading } = useCards();
  const [fetched, setFetched] = useState<{ setId: string; set: LoteriaSet | null; failed: boolean } | null>(null);

  // Las cartas sirven cuando ya se pidieron para esta lotería: antes, la lista puede ser la de otra
  const [loadingSeenFor, setLoadingSeenFor] = useState<string | null>(null);

  useEffect(() => {
    if (setId) setCurrentSetId(setId);
  }, [setId, setCurrentSetId]);

  useEffect(() => {
    if (cardsLoading && currentSetId) setLoadingSeenFor(currentSetId);
  }, [cardsLoading, currentSetId]);

  const userId = user?.id;
  const listed = sets.find((s) => s.id === setId) ?? null;

  useEffect(() => {
    if (!setId || !userId || listed) return;
    let cancelled = false;
    SetRepository.getSet(setId, userId)
      .then((set) => {
        if (!cancelled) setFetched({ setId, set, failed: false });
      })
      .catch((err: unknown) => {
        logger.error('Error loading set for the caller:', err);
        if (!cancelled) setFetched({ setId, set: null, failed: true });
      });
    return () => {
      cancelled = true;
    };
  }, [setId, userId, listed]);

  const ownFetch = fetched?.setId === setId ? fetched : null;
  const set = listed ?? ownFetch?.set ?? null;

  if (!set) {
    if (ownFetch?.failed) return { status: 'error' };
    if (ownFetch) return { status: 'notFound' };
    return { status: 'loading' };
  }
  if (currentSetId !== setId || loadingSeenFor !== setId || cardsLoading) return { status: 'loading' };
  return { status: 'ready', set, cards };
};
