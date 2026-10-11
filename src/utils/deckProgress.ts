/** Pantalla C1 Cartas (FEAT-34): avance de la baraja, cartas con IA y fotos que se pueden subir. */

export interface DeckProgress {
  /** Cartas que faltan para el mínimo del modo; 0 si ya alcanzan. */
  missing: number;
  /** Avance de la barra, de 0 a 100. */
  percent: number;
  isComplete: boolean;
}

export function deckProgress(cardCount: number, minCards: number): DeckProgress {
  const missing = Math.max(0, minCards - cardCount);
  return {
    missing,
    percent: Math.min(100, Math.round((cardCount / minCards) * 100)),
    isComplete: missing === 0,
  };
}

/** Los mismos formatos que acepta el selector de archivos de «Subir fotos». */
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

/** De lo que se arrastra a la pantalla, solo las imágenes que se pueden subir. */
export function pickImageFiles(files: readonly File[]): File[] {
  return files.filter((file) => ACCEPTED_IMAGE_TYPES.includes(file.type));
}

export interface AiDeckSummary {
  total: number;
  /** Cartas que ya tienen IA. */
  transformed: number;
  /** Cartas sin IA: las mismas que transforma el lote. */
  remaining: number;
}

/** Solo cuenta lo que se muestra en el panel «Cartas con IA»; no decide qué se cobra. */
export function aiDeckSummary(cards: readonly { isAiGenerated?: boolean }[]): AiDeckSummary {
  const transformed = cards.filter((card) => card.isAiGenerated === true).length;
  return { total: cards.length, transformed, remaining: cards.length - transformed };
}
