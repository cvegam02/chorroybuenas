import { useCallback, useEffect, useRef, useState } from 'react';
import { logger } from '../../../utils/logger';
import { prepareSeasonalCard, validateCardFile } from '../../../utils/seasonalCards';

export interface SeasonalCard {
  id: string;
  fileName: string;
  /** La carta ya en 2:3, lista para el PDF. Vive solo en el navegador. */
  blob: Blob;
  url: string;
  offRatio: boolean;
}

export interface RejectedFile {
  fileName: string;
  reason: string;
}

export interface SeasonalCardsState {
  cards: SeasonalCard[];
  rejected: RejectedFile[];
  isAdding: boolean;
  addFiles: (files: readonly File[]) => Promise<void>;
  removeCard: (id: string) => void;
}

const byFileName = new Intl.Collator('es', { numeric: true, sensitivity: 'base' });

/** Las cartas cargadas para armar una lotería de temporada. No se guardan en ningún lado (FEAT-23, decisión 4). */
export function useSeasonalCards(): SeasonalCardsState {
  const [cards, setCards] = useState<SeasonalCard[]>([]);
  const [rejected, setRejected] = useState<RejectedFile[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const urlsRef = useRef(new Set<string>());

  useEffect(() => {
    const urls = urlsRef.current;
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
      urls.clear();
    };
  }, []);

  const addFiles = useCallback(async (files: readonly File[]) => {
    if (files.length === 0) return;
    setIsAdding(true);
    const failures: RejectedFile[] = [];
    // De una en una: preparar 54 imágenes grandes a la vez puede agotar la memoria del navegador.
    for (const file of [...files].sort((a, b) => byFileName.compare(a.name, b.name))) {
      const rejection = validateCardFile(file);
      if (rejection) {
        failures.push({ fileName: file.name, reason: rejection });
        continue;
      }
      try {
        const { blob, offRatio } = await prepareSeasonalCard(file);
        const url = URL.createObjectURL(blob);
        urlsRef.current.add(url);
        const card: SeasonalCard = { id: crypto.randomUUID(), fileName: file.name, blob, url, offRatio };
        setCards((prev) => [...prev, card]);
      } catch (error) {
        logger.error(`Carta de temporada: no se pudo preparar ${file.name}:`, error);
        failures.push({ fileName: file.name, reason: 'No se pudo leer la imagen.' });
      }
    }
    setRejected(failures);
    setIsAdding(false);
  }, []);

  const removeCard = useCallback((id: string) => {
    setCards((prev) => {
      const removed = prev.find((card) => card.id === id);
      if (removed) {
        URL.revokeObjectURL(removed.url);
        urlsRef.current.delete(removed.url);
      }
      return prev.filter((card) => card.id !== id);
    });
  }, []);

  return { cards, rejected, isAdding, addFiles, removeCard };
}
