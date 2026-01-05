import { Card, Board, BoardStorage, BoardsCollection } from '../types';
import { saveImage as saveImageToIndexedDB } from './indexedDB';

const CARDS_KEY = 'loteria_cards';
const BOARDS_KEY = 'loteria_boards';
const BOARD_COUNT_KEY = 'loteria_board_count';
const MIGRATION_FLAG_KEY = 'loteria_migrated_to_indexeddb';

// Card metadata (without images) for localStorage
interface CardMetadata {
  id: string;
  title: string;
}

/**
 * Saves cards metadata to localStorage and images to IndexedDB
 */
export const saveCards = async (cards: Card[]): Promise<void> => {
  try {
    // Save only metadata to localStorage (much smaller)
    const cardsMetadata: CardMetadata[] = cards.map(card => ({
      id: card.id,
      title: card.title,
    }));
    
    const serialized = JSON.stringify(cardsMetadata);
    const sizeKB = serialized.length / 1024;
    console.log(`Saving ${cards.length} cards metadata to localStorage (size: ${sizeKB.toFixed(2)} KB)`);
    
    localStorage.setItem(CARDS_KEY, serialized);
    
    // Save images to IndexedDB
    const imagePromises = cards
      .filter(card => card.image && card.image.startsWith('data:'))
      .map(async (card) => {
        try {
          // Save base64 image to IndexedDB and get blob URL
          const blobURL = await saveImageToIndexedDB(card.id, card.image!);
          console.log(`✓ Saved image for card ${card.id} to IndexedDB`);
          return blobURL;
        } catch (error) {
          console.error(`Error saving image for card ${card.id}:`, error);
          // Continue with other images even if one fails
          return null;
        }
      });
    
    await Promise.all(imagePromises);
    
    // Verify the metadata save worked
    const verifyStored = localStorage.getItem(CARDS_KEY);
    if (!verifyStored) {
      throw new Error('Failed to verify saved data');
    }
    const verifyParsed = JSON.parse(verifyStored);
    if (verifyParsed.length !== cards.length) {
      throw new Error(`Data corruption: tried to save ${cards.length} cards but only ${verifyParsed.length} were saved`);
    }
    
    console.log(`✓ Successfully saved ${cards.length} cards (metadata + images)`);
  } catch (error) {
    console.error('Error saving cards:', error);
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      console.error('localStorage quota exceeded! This should not happen with IndexedDB migration.');
      alert('Error: No hay suficiente espacio en el almacenamiento. Por favor, intenta nuevamente.');
      throw new Error('QuotaExceededError: No hay suficiente espacio para guardar todas las cartas');
    }
    throw error;
  }
};

/**
 * Loads cards metadata from localStorage and images from IndexedDB
 */
export const loadCards = async (): Promise<Card[]> => {
  try {
    const stored = localStorage.getItem(CARDS_KEY);
    if (!stored) {
      console.log('No cards found in localStorage');
      // Check for legacy format and migrate
      return await migrateLegacyCards();
    }
    
    const cardsMetadata: CardMetadata[] = JSON.parse(stored);
    console.log(`Loaded ${cardsMetadata.length} cards metadata from localStorage`);
    
    if (!Array.isArray(cardsMetadata)) {
      return [];
    }
    
    // Load images from IndexedDB
    const { getImage } = await import('./indexedDB');
    const cardsWithImages: Card[] = await Promise.all(
      cardsMetadata.map(async (metadata) => {
        const imageURL = await getImage(metadata.id);
        return {
          id: metadata.id,
          title: metadata.title,
          image: imageURL || undefined,
        };
      })
    );
    
    console.log(`✓ Loaded ${cardsWithImages.length} cards with images from IndexedDB`);
    return cardsWithImages;
  } catch (error) {
    console.error('Error loading cards:', error);
    return [];
  }
};

/**
 * Migrates legacy cards with base64 images to IndexedDB
 */
const migrateLegacyCards = async (): Promise<Card[]> => {
  try {
    // Check if we've already migrated
    const migrated = localStorage.getItem(MIGRATION_FLAG_KEY);
    if (migrated === 'true') {
      return [];
    }
    
    // Try to find cards with base64 images in localStorage (old format)
    console.log('Checking for legacy cards format...');
    const stored = localStorage.getItem(CARDS_KEY);
    if (!stored) {
      localStorage.setItem(MIGRATION_FLAG_KEY, 'true');
      return [];
    }
    
    // Try to parse as old format (with images embedded)
    try {
      const oldCards: Array<{ id: string; title: string; image?: string }> = JSON.parse(stored);
      if (Array.isArray(oldCards) && oldCards.length > 0) {
        // Check if any card has base64 image
        const hasBase64Images = oldCards.some(card => card.image && card.image.startsWith('data:'));
        if (hasBase64Images) {
          console.log(`Found ${oldCards.length} legacy cards with base64 images. Migrating to IndexedDB...`);
          
          // Migrate images to IndexedDB
          const { migrateImagesToIndexedDB } = await import('./indexedDB');
          const cardsToMigrate = oldCards
            .filter(card => card.image && card.image.startsWith('data:'))
            .map(card => ({ id: card.id, image: card.image! }));
          
          if (cardsToMigrate.length > 0) {
            await migrateImagesToIndexedDB(cardsToMigrate);
            console.log(`✓ Migrated ${cardsToMigrate.length} images to IndexedDB`);
          }
          
          // Save only metadata (without images) to localStorage
          const cardsMetadata: CardMetadata[] = oldCards.map(card => ({
            id: card.id,
            title: card.title,
          }));
          localStorage.setItem(CARDS_KEY, JSON.stringify(cardsMetadata));
          
          // Load cards with blob URLs from IndexedDB
          const { getImage } = await import('./indexedDB');
          const migratedCards: Card[] = await Promise.all(
            cardsMetadata.map(async (metadata) => {
              const imageURL = await getImage(metadata.id);
              return {
                id: metadata.id,
                title: metadata.title,
                image: imageURL || undefined,
              };
            })
          );
          
          console.log(`✓ Migration complete. Loaded ${migratedCards.length} cards with images from IndexedDB`);
          localStorage.setItem(MIGRATION_FLAG_KEY, 'true');
          return migratedCards;
        }
      }
    } catch (parseError) {
      // If parse fails, might be new format already
      console.log('Could not parse as legacy format, assuming new format');
    }
    
    // Set migration flag
    localStorage.setItem(MIGRATION_FLAG_KEY, 'true');
    return [];
  } catch (error) {
    console.error('Error during legacy migration:', error);
    return [];
  }
};

export const saveBoards = async (boards: Board[], count: number): Promise<void> => {
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
export const loadBoards = async (): Promise<Board[] | null> => {
  try {
    const stored = localStorage.getItem(BOARDS_KEY);
    if (!stored) {
      return null;
    }
    
    const collection: BoardsCollection = JSON.parse(stored);
    const allCards = await loadCards();
    
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

export const clearAllData = async (): Promise<void> => {
  try {
    localStorage.removeItem(CARDS_KEY);
    localStorage.removeItem(BOARDS_KEY);
    localStorage.removeItem(BOARD_COUNT_KEY);
    localStorage.removeItem(MIGRATION_FLAG_KEY);
    
    // Clear IndexedDB images
    const { clearAllImages } = await import('./indexedDB');
    await clearAllImages();
    console.log('✓ Cleared all data from localStorage and IndexedDB');
  } catch (error) {
    console.error('Error clearing data:', error);
  }
};

