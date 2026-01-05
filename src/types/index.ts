export interface Card {
  id: string;
  title: string;
  image?: string; // blob URL when loaded from IndexedDB, base64 only during migration/legacy
}

// Board can have either full cards or just card IDs (for storage optimization)
export interface Board {
  id: string;
  cards: Card[]; // Full cards when in memory
  cardIds?: string[]; // Card IDs when stored (optional, for backwards compatibility)
}

// Optimized board storage (only IDs, much smaller)
export interface BoardStorage {
  id: string;
  cardIds: string[];
}

export interface BoardsCollection {
  count: number;
  boards: BoardStorage[]; // Store only IDs to save space
}

