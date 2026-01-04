import { useState } from 'react';
import { Board } from '../types';
import { loadCards } from '../utils/storage';

// Fisher-Yates shuffle algorithm
const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export const useBoard = () => {
  const [boards, setBoards] = useState<Board[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const generateBoards = (count: number): Board[] => {
    const allCards = loadCards();
    
    console.log(`Generating boards with ${allCards.length} cards from localStorage`);
    
    if (!Array.isArray(allCards)) {
      throw new Error('Error al cargar las cartas. Por favor, asegúrate de haber guardado las cartas correctamente.');
    }
    
    if (allCards.length < 16) {
      throw new Error(`No hay suficientes cartas para generar un tablero. Necesitas al menos 16 cartas, pero solo tienes ${allCards.length}. Por favor, verifica que todas tus cartas se hayan guardado correctamente.`);
    }

    const generatedBoards: Board[] = [];

    for (let i = 0; i < count; i++) {
      // Shuffle all cards and take first 16 (no duplicates within board)
      const shuffled = shuffleArray(allCards);
      const selectedCards = shuffled.slice(0, 16);

      const board: Board = {
        id: `board-${i + 1}-${Date.now()}-${Math.random()}`,
        cards: selectedCards,
      };

      generatedBoards.push(board);
    }

    return generatedBoards;
  };

  const generateBoardsAsync = async (count: number): Promise<Board[]> => {
    setIsGenerating(true);
    try {
      // Small delay to allow UI to update
      await new Promise(resolve => setTimeout(resolve, 100));
      const newBoards = generateBoards(count);
      setBoards(newBoards);
      return newBoards;
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    boards,
    generateBoards: generateBoardsAsync,
    isGenerating,
  };
};

