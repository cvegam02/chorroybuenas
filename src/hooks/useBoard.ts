import { useState, useEffect } from 'react';
import { Board, Card } from '../types';
import { loadCards } from '../utils/storage';
import { useAuth } from '../contexts/AuthContext';
import { useSetContext } from '../contexts/SetContext';
import { BoardRepository } from '../repositories/BoardRepository';

// Fisher-Yates shuffle algorithm
const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// Get a sorted array of card IDs from a board (for comparison)
const getCardIds = (cards: Array<{ id: string }>): string[] => {
  return cards.map(card => card.id).sort();
};

// Check if two boards have the same cards (regardless of order)
const areBoardsDuplicate = (board1: Board, board2: Board): boolean => {
  const ids1 = getCardIds(board1.cards);
  const ids2 = getCardIds(board2.cards);

  if (ids1.length !== ids2.length) {
    return false;
  }

  return ids1.every((id, index) => id === ids2[index]);
};

// Check if a board is duplicate of any board in the array
const isDuplicateBoard = (board: Board, existingBoards: Board[]): boolean => {
  return existingBoards.some(existingBoard => areBoardsDuplicate(board, existingBoard));
};

export const useBoard = () => {
  const [boards, setBoards] = useState<Board[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const { user } = useAuth();
  const { currentSetId } = useSetContext();

  useEffect(() => {
    const loadCloudBoards = async () => {
      if (user && currentSetId) {
        try {
          const cloudBoards = await BoardRepository.getBoards(user.id, currentSetId);
          setBoards(cloudBoards);
        } catch (error) {
          console.error('Error loading cloud boards:', error);
        }
      } else {
        setBoards([]);
      }
    };
    loadCloudBoards();
  }, [user, currentSetId]);

  const generateBoardsAsync = async (count: number, gridSize: 9 | 16 = 16): Promise<Board[]> => {
    setIsGenerating(true);
    try {
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

      const generatedBoards: Board[] = [];
      const MAX_ATTEMPTS = 1000; // Maximum attempts to find a unique board
      let totalAttempts = 0;

      for (let i = 0; i < count; i++) {
        let board: Board;
        let attempts = 0;
        let isUnique = false;

        // Keep generating boards until we find a unique one
        while (!isUnique && attempts < MAX_ATTEMPTS) {
          // Shuffle all cards and take first gridSize (no duplicates within board)
          const shuffled = shuffleArray(allCards);
          const selectedCards = shuffled.slice(0, gridSize);

          board = {
            id: `board-${i + 1}-${Date.now()}-${Math.random()}`,
            cards: selectedCards,
            gridSize,
          };

          // Check if this board is unique
          if (!isDuplicateBoard(board, generatedBoards)) {
            isUnique = true;
          } else {
            attempts++;
            totalAttempts++;
          }
        }

        // Add the board even if not unique (to avoid infinite loop)
        generatedBoards.push(board!);
      }

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
      console.error('Error clearing boards:', error);
      throw error;
    }
  };

  return {
    boards,
    generateBoards: generateBoardsAsync,
    clearBoards: clearBoardsAsync,
    isGenerating,
  };
};

