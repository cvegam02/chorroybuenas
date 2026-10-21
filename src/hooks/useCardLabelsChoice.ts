import { useCallback, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSetContext } from '../contexts/SetContext';
import { SetRepository } from '../repositories/SetRepository';
import { cardLabelsOrDefault, type CardLabels } from '../utils/cardLabels';
import { logger } from '../utils/logger';
import { loadVisitorCardLabels, saveVisitorCardLabels } from '../utils/storage';

/**
 * Qué se ve en las cartas de la lotería activa y cómo cambiarlo (FEAT-51, US A1). Con sesión se guarda en
 * la lotería; sin sesión, en el navegador, y pasa a la cuenta con las cartas. Si no se puede guardar en la
 * lotería, vuelve a lo que tenía y `changeLabels` da `false`.
 */
export const useCardLabelsChoice = () => {
  const { user } = useAuth();
  const { currentSetId, sets, setSets } = useSetContext();
  const [visitorLabels, setVisitorLabels] = useState<CardLabels>(() => cardLabelsOrDefault(loadVisitorCardLabels()));

  const currentSet = sets.find((set) => set.id === currentSetId);
  const labels = user ? cardLabelsOrDefault(currentSet?.card_labels) : visitorLabels;

  const setLabelsOf = useCallback(
    (setId: string, next: CardLabels | undefined) =>
      setSets((prev) => prev.map((set) => (set.id === setId ? { ...set, card_labels: next } : set))),
    [setSets]
  );

  const changeLabels = useCallback(
    async (next: CardLabels): Promise<boolean> => {
      if (!user) {
        setVisitorLabels(next);
        saveVisitorCardLabels(next);
        return true;
      }
      if (!currentSetId) return false;

      const previous = currentSet?.card_labels;
      setLabelsOf(currentSetId, next);
      try {
        await SetRepository.updateSet(currentSetId, user.id, { card_labels: next });
        return true;
      } catch (error) {
        logger.error('Error saving card labels:', error);
        setLabelsOf(currentSetId, previous);
        return false;
      }
    },
    [user, currentSetId, currentSet?.card_labels, setLabelsOf]
  );

  return { labels, changeLabels };
};
