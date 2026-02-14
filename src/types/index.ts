export type GridSize = 9 | 16;

export interface Card {
  id: string;
  title: string;
  image?: string; // blob URL when loaded from IndexedDB, base64 only during migration/legacy
  originalImage?: string; // Backup of the original image before AI transformation
  /** Supabase Storage path (cuando está logueado). Permite descargar sin depender de CORS de la signed URL. */
  imagePath?: string;
  /** Supabase Storage path para la imagen original (cuando aplica). */
  originalImagePath?: string;
  isAiGenerated?: boolean;
  isProcessing?: boolean;
}

// Board can have either full cards or just card IDs (for storage optimization)
export interface Board {
  id: string;
  cards: Card[]; // Full cards when in memory
  cardIds?: string[]; // Card IDs when stored (optional, for backwards compatibility)
  gridSize?: GridSize; // 9 for 3x3 (Kids), 16 for 4x4 (Classic). Defaults to 16 if undefined.
}

// Optimized board storage (only IDs, much smaller)
export interface BoardStorage {
  id: string;
  cardIds: string[];
  gridSize?: GridSize;
}

export interface BoardsCollection {
  count: number;
  boards: BoardStorage[]; // Store only IDs to save space
}

