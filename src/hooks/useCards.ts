import { useState, useEffect } from 'react';
import { Card } from '../types';
import { saveCards, loadCards } from '../utils/storage';
import { saveImage as saveImageToIndexedDB } from '../utils/indexedDB';

const MIN_CARDS = 20;

export const useCards = () => {
  const [cards, setCards] = useState<Card[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load cards from localStorage and IndexedDB on mount
    // Migration is handled automatically by loadCards()
    const loadCardsData = async () => {
      try {
        const loadedCards = await loadCards();
        setCards(loadedCards);
      } catch (error) {
        console.error('Error loading cards:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadCardsData();
  }, []);

  const addCard = async (card: Card) => {
    try {
      // If card has base64 image, save to IndexedDB first
      if (card.image && card.image.startsWith('data:')) {
        const blobURL = await saveImageToIndexedDB(card.id, card.image);
        card = { ...card, image: blobURL };
      }
      
      setCards(prevCards => {
        const newCards = [...prevCards, card];
        saveCards(newCards); // Async but don't wait
        return newCards;
      });
    } catch (error) {
      console.error('Error adding card:', error);
      alert('Error al agregar la carta. Por favor, intenta nuevamente.');
    }
  };

  const addCards = async (newCards: Card[]) => {
    try {
      // Save all base64 images to IndexedDB first
      const cardsWithImages = await Promise.all(
        newCards.map(async (card) => {
          if (card.image && card.image.startsWith('data:')) {
            try {
              const blobURL = await saveImageToIndexedDB(card.id, card.image);
              return { ...card, image: blobURL };
            } catch (error) {
              console.error(`Error saving image for card ${card.id}:`, error);
              return card; // Continue with original if save fails
            }
          }
          return card;
        })
      );
      
      setCards(prevCards => {
        const updatedCards = [...prevCards, ...cardsWithImages];
        console.log(`Adding ${newCards.length} cards. Total will be: ${updatedCards.length}`);
        
        // Save async (don't wait)
        saveCards(updatedCards).catch(error => {
          console.error('Error saving cards:', error);
          const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
          alert(`Error al guardar las cartas: ${errorMessage}`);
        });
        
        return updatedCards;
      });
    } catch (error) {
      console.error('Error adding cards:', error);
      alert('Error al agregar las cartas. Por favor, intenta nuevamente.');
    }
  };

  const removeCard = async (cardId: string) => {
    try {
      // Delete image from IndexedDB
      const { deleteImage } = await import('../utils/indexedDB');
      await deleteImage(cardId);
      
      const newCards = cards.filter(card => card.id !== cardId);
      setCards(newCards);
      await saveCards(newCards);
    } catch (error) {
      console.error('Error removing card:', error);
    }
  };

  const clearCards = async () => {
    try {
      // Clear all images from IndexedDB
      const { clearAllImages } = await import('../utils/indexedDB');
      await clearAllImages();
      
      setCards([]);
      await saveCards([]);
    } catch (error) {
      console.error('Error clearing cards:', error);
    }
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

