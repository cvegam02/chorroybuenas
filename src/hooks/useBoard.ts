import { useState, useEffect } from 'react';
import { Board, Card } from '../types';
import { loadCards } from '../utils/storage';
import { useAuth } from '../contexts/AuthContext';
import { useSetContext } from '../contexts/SetContext';
import { BoardRepository } from '../repositories/BoardRepository';
import { logger } from '../utils/logger';
import { generateUniqueBoards } from '../utils/boardGeneration';

export const useBoard = () => {
  const [boards, setBoards] = useState<Board[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isBoardsLoading, setIsBoardsLoading] = useState(false);
  const { user } = useAuth();
  const { currentSetId } = useSetContext();

  useEffect(() => {
    // Clear immediately so stale boards from a previous set are never shown
    setBoards([]);

    if (!user || !currentSetId) return;

    let cancelled = false;
    setIsBoardsLoading(true);

    BoardRepository.getBoards(user.id, currentSetId)
      .then((cloudBoards) => {
        if (!cancelled) setBoards(cloudBoards);
      })
      .catch((error) => {
        logger.error('Error loading cloud boards:', error);
      })
      .finally(() => {
        if (!cancelled) setIsBoardsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user, currentSetId]);

  const generateBoardsAsync = async (count: number, gridSize: 9 | 16 = 16): Promise<Board[]> => {
    setIsGenerating(true);
    try {
      // Borrar tableros anteriores antes de generar nuevos (solo usuarios logueados; invitados se sobrescribe en saveBoards)
      if (user && currentSetId) {
        await BoardRepository.deleteAllBoardsForSet(user.id, currentSetId);
      }

      // Small delay to allow UI to update
      await new Promise(resolve => setTimeout(resolve, 100));

      let allCards: Card[];
      if (user && currentSetId) {
        const { CardRepository } = await import('../repositories/CardRepository');
        allCards = await CardRepository.getCards(user.id, currentSetId);
      } else if (user) {
        allCards = [];
      } else {
        allCards = await loadCards();
      }


      if (!Array.isArray(allCards)) {
        throw new Error('Error al cargar las cartas. Por favor, asegúrate de haber guardado las cartas correctamente.');
      }

      if (allCards.length < gridSize) {
        throw new Error(`No hay suficientes cartas para generar un tablero de ${gridSize === 16 ? '4x4' : '3x3'}. Necesitas al menos ${gridSize} cartas, pero solo tienes ${allCards.length}.`);
      }

      const generatedBoards: Board[] = generateUniqueBoards(allCards, count, gridSize).map((selectedCards, i) => ({
        id: `board-${i + 1}-${Date.now()}-${Math.random()}`,
        cards: selectedCards,
        gridSize,
      }));

      setBoards(generatedBoards);

      if (user && currentSetId) {
        for (const board of generatedBoards) {
          await BoardRepository.saveBoard(user.id, board, currentSetId);
        }
      }

      return generatedBoards;
    } finally {
      setIsGenerating(false);
    }
  };

  const clearBoardsAsync = async (): Promise<void> => {
    if (!user || !currentSetId) {
      setBoards([]);
      return;
    }
    try {
      await BoardRepository.deleteAllBoardsForSet(user.id, currentSetId);
      setBoards([]);
    } catch (error) {
      logger.error('Error clearing boards:', error);
      throw error;
    }
  };

  return {
    boards,
    generateBoards: generateBoardsAsync,
    clearBoards: clearBoardsAsync,
    isGenerating,
    isBoardsLoading,
  };
};

