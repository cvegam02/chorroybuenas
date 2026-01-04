import { useState, useEffect } from 'react';
import { Card } from '../types';
import { saveCards, loadCards } from '../utils/storage';

const MIN_CARDS = 30;

export const useCards = () => {
  const [cards, setCards] = useState<Card[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load cards from localStorage on mount
    const loadedCards = loadCards();
    setCards(loadedCards);
    setIsLoading(false);
  }, []);

  const addCard = (card: Card) => {
    setCards(prevCards => {
      const newCards = [...prevCards, card];
      saveCards(newCards);
      return newCards;
    });
  };

  const addCards = (newCards: Card[]) => {
    setCards(prevCards => {
      const updatedCards = [...prevCards, ...newCards];
      console.log(`Adding ${newCards.length} cards. Total will be: ${updatedCards.length}`);
      try {
        saveCards(updatedCards);
        // Verify the save worked
        const saved = loadCards();
        console.log(`Verification: ${saved.length} cards in localStorage after save`);
        if (saved.length !== updatedCards.length) {
          console.error(`CRITICAL: Mismatch detected! Tried to save ${updatedCards.length} but only ${saved.length} were saved`);
          // Try to save again with the previous state if current save failed
          const previousCount = prevCards.length;
          if (saved.length === previousCount) {
            console.error('Save failed - reverting to previous state');
            alert(`Error: No se pudieron guardar todas las cartas. Solo se guardaron ${saved.length} de ${updatedCards.length} cartas. Esto puede deberse a que las imágenes son demasiado grandes.`);
            return prevCards; // Return previous state if save failed
          }
        }
      } catch (error) {
        console.error('Error saving cards:', error);
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        alert(`Error al guardar las cartas: ${errorMessage}`);
        return prevCards; // Return previous state on error
      }
      return updatedCards;
    });
  };

  const removeCard = (cardId: string) => {
    const newCards = cards.filter(card => card.id !== cardId);
    setCards(newCards);
    saveCards(newCards);
  };

  const clearCards = () => {
    setCards([]);
    saveCards([]);
  };

  const hasMinimumCards = cards.length >= MIN_CARDS;

  return {
    cards,
    isLoading,
    addCard,
    addCards,
    removeCard,
    clearCards,
    hasMinimumCards,
    cardCount: cards.length,
    minCards: MIN_CARDS,
  };
};

