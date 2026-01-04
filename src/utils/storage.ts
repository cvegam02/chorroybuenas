import { Card, Board, BoardStorage, BoardsCollection } from '../types';

const CARDS_KEY = 'loteria_cards';
const BOARDS_KEY = 'loteria_boards';
const BOARD_COUNT_KEY = 'loteria_board_count';

export const saveCards = (cards: Card[]): void => {
  try {
    const serialized = JSON.stringify(cards);
    const sizeKB = serialized.length / 1024;
    console.log(`Saving ${cards.length} cards to localStorage (size: ${sizeKB.toFixed(2)} KB)`);
    
    localStorage.setItem(CARDS_KEY, serialized);
    
    // Verify the save worked
    const verifyStored = localStorage.getItem(CARDS_KEY);
    if (!verifyStored) {
      throw new Error('Failed to verify saved data');
    }
    const verifyParsed = JSON.parse(verifyStored);
    if (verifyParsed.length !== cards.length) {
      throw new Error(`Data corruption: tried to save ${cards.length} cards but only ${verifyParsed.length} were saved`);
    }
    
    console.log(`✓ Successfully saved ${cards.length} cards to localStorage`);
  } catch (error) {
    console.error('Error saving cards to localStorage:', error);
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      console.error('localStorage quota exceeded! Some cards may not be saved.');
      alert('Error: No hay suficiente espacio en el almacenamiento. Las imágenes son muy grandes. Intenta usar imágenes con menor tamaño o comprimirlas.');
      throw new Error('QuotaExceededError: No hay suficiente espacio para guardar todas las cartas');
    }
    throw error; // Re-throw to let caller know save failed
  }
};

export const loadCards = (): Card[] => {
  try {
    const stored = localStorage.getItem(CARDS_KEY);
    if (!stored) {
      console.log('No cards found in localStorage');
      return [];
    }
    const cards = JSON.parse(stored);
    console.log(`Loaded ${cards.length} cards from localStorage`);
    return Array.isArray(cards) ? cards : [];
  } catch (error) {
    console.error('Error loading cards from localStorage:', error);
    return [];
  }
};

export const saveBoards = (boards: Board[], count: number): void => {
  try {
    // Only save card IDs to avoid duplicating image data
    const boardsStorage: BoardStorage[] = boards.map(board => ({
      id: board.id,
      cardIds: board.cards.map(card => card.id),
    }));
    
    const collection: BoardsCollection = {
      count,
      boards: boardsStorage,
    };
    
    const serialized = JSON.stringify(collection);
    const sizeKB = serialized.length / 1024;
    console.log(`Saving ${boards.length} boards (${sizeKB.toFixed(2)} KB - optimized with IDs only)`);
    
    localStorage.setItem(BOARDS_KEY, serialized);
    
    // Verify the save worked
    const verifyStored = localStorage.getItem(BOARDS_KEY);
    if (!verifyStored) {
      throw new Error('Failed to verify saved boards');
    }
    
    console.log(`✓ Successfully saved ${boards.length} boards to localStorage`);
  } catch (error) {
    console.error('Error saving boards to localStorage:', error);
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      console.error('localStorage quota exceeded when saving boards!');
      alert('Error: No hay suficiente espacio para guardar los tableros. Esto no debería pasar si las cartas se guardaron correctamente.');
      throw error;
    }
    throw error;
  }
};

/**
 * Loads boards and reconstructs them with full card objects from stored IDs
 */
export const loadBoards = (): Board[] | null => {
  try {
    const stored = localStorage.getItem(BOARDS_KEY);
    if (!stored) {
      return null;
    }
    
    const collection: BoardsCollection = JSON.parse(stored);
    const allCards = loadCards();
    
    // Create a map of card IDs to card objects for fast lookup
    const cardsMap = new Map<string, Card>();
    allCards.forEach(card => {
      cardsMap.set(card.id, card);
    });
    
    // Reconstruct boards with full card objects
    const boards: Board[] = collection.boards.map(boardStorage => {
      const cards: Card[] = boardStorage.cardIds
        .map(cardId => cardsMap.get(cardId))
        .filter((card): card is Card => card !== undefined);
      
      return {
        id: boardStorage.id,
        cards,
      };
    });
    
    console.log(`Loaded ${boards.length} boards (reconstructed from ${collection.boards.length} stored)`);
    return boards;
  } catch (error) {
    console.error('Error loading boards from localStorage:', error);
    return null;
  }
};

/**
 * Loads boards collection with just IDs (for metadata)
 */
export const loadBoardsCollection = (): BoardsCollection | null => {
  try {
    const stored = localStorage.getItem(BOARDS_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error('Error loading boards collection from localStorage:', error);
    return null;
  }
};

export const saveBoardCount = (count: number): void => {
  try {
    localStorage.setItem(BOARD_COUNT_KEY, JSON.stringify(count));
  } catch (error) {
    console.error('Error saving board count to localStorage:', error);
  }
};

export const loadBoardCount = (): number | null => {
  try {
    const stored = localStorage.getItem(BOARD_COUNT_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error('Error loading board count from localStorage:', error);
    return null;
  }
};

export const clearAllData = (): void => {
  try {
    localStorage.removeItem(CARDS_KEY);
    localStorage.removeItem(BOARDS_KEY);
    localStorage.removeItem(BOARD_COUNT_KEY);
  } catch (error) {
    console.error('Error clearing localStorage:', error);
  }
};

