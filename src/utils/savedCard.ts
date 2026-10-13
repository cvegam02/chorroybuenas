import type { Card } from '../types';

/** Lo que quedó en Storage al guardar una carta: solo trae lo que se subió en ese guardado. */
export interface SavedCardImages {
  /** Ruta de la imagen nueva. La pantalla reconoce la imagen por su ruta: sin ella, seguiría viendo la anterior. */
  imagePath?: string;
  imageUrl?: string;
  originalImageUrl?: string;
}

/** La carta como queda en pantalla tras guardarle cambios en la cuenta. */
export function cardAfterSave(card: Card, updates: Partial<Card>, saved: SavedCardImages): Card {
  return {
    ...card,
    ...updates,
    ...(saved.imageUrl ? { image: saved.imageUrl } : {}),
    ...(saved.imagePath ? { imagePath: saved.imagePath } : {}),
    ...(saved.originalImageUrl ? { originalImage: saved.originalImageUrl } : {}),
  };
}
