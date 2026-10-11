import { useEffect, useState } from 'react';
import type { Card } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useSetContext } from '../contexts/SetContext';
import { CardRepository } from '../repositories/CardRepository';
import { loadCards } from '../utils/storage';
import { withCardNumbers } from '../utils/cardNumbers';
import { logger } from '../utils/logger';

interface DeckSnapshot {
  cards: Card[];
  isLoading: boolean;
}

/**
 * La baraja como está guardada al abrir la pantalla, de la misma fuente que usan el generador de
 * tableros y el PDF: la lotería abierta si hay sesión, este navegador si no. Solo lee; no guarda nada.
 */
export const useDeckSnapshot = (): DeckSnapshot => {
  const { user } = useAuth();
  const userId = user?.id;
  const { currentSetId } = useSetContext();
  const [snapshot, setSnapshot] = useState<DeckSnapshot>({ cards: [], isLoading: true });

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        let cards: Card[];
        if (userId && currentSetId) {
          cards = await CardRepository.getCards(userId, currentSetId);
        } else if (userId) {
          cards = []; // Con sesión y sin lotería abierta no hay baraja, igual que al generar tableros
        } else {
          cards = await loadCards();
        }
        if (!cancelled) setSnapshot({ cards: withCardNumbers(cards), isLoading: false });
      } catch (error) {
        logger.error('Error loading the deck:', error);
        if (!cancelled) setSnapshot({ cards: [], isLoading: false });
      }
    };
    load();

    return () => {
      cancelled = true;
    };
  }, [userId, currentSetId]);

  return snapshot;
};
