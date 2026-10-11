import type { Card } from '../types';
import { CardRepository } from '../repositories/CardRepository';
import { SetRepository } from '../repositories/SetRepository';
import { logger } from '../utils/logger';

/** Lo que Mi cuenta muestra de una lotería sin abrirla. */
export interface SetSummary {
  cardCount: number;
  boardCount: number;
  /** Sus primeras cartas, numeradas como en la lotería (1, 2, 3), listas para dibujarse. */
  previewCards: Card[];
}

/**
 * Resumen de todas las loterías de la cuenta: una consulta para los datos y una llamada para firmar las
 * imágenes del abanico. Si las imágenes no se pueden firmar, el resumen sigue sirviendo: cada carta se
 * dibuja desde su archivo guardado.
 */
export const loadSetSummaries = async (userId: string): Promise<Map<string, SetSummary>> => {
  const rows = await SetRepository.getSetSummaries(userId);
  const paths = rows.flatMap((row) => row.previewCards.flatMap((card) => (card.imagePath ? [card.imagePath] : [])));

  let urls = new Map<string, string>();
  try {
    urls = await CardRepository.getImageUrlsInOneCall(paths);
  } catch (error) {
    logger.warn('Error signing preview images for set summaries:', error);
  }

  return new Map(
    rows.map((row) => [
      row.setId,
      {
        cardCount: row.cardCount,
        boardCount: row.boardCount,
        previewCards: row.previewCards.map((card, index) => ({
          id: card.id,
          title: card.title,
          image: card.imagePath ? urls.get(card.imagePath) : undefined,
          imagePath: card.imagePath ?? undefined,
          isAiGenerated: card.isAiGenerated,
          number: index + 1,
        })),
      },
    ]),
  );
};
