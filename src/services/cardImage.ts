import { Card } from '../types';
import { blobToBase64, getImageBlob, cacheImageBlob } from '../utils/indexedDB';
import { CardRepository } from '../repositories/CardRepository';
import { logger } from '../utils/logger';
import { urlToBase64 } from './pdf/images';

/**
 * Lee la imagen de una carta como data URL: primero la copia local (IndexedDB), luego Storage, luego la que
 * trae la carta. Devuelve `null` si no se pudo leer.
 */
export const readStoredCardImage = async (card: Card): Promise<string | null> => {
  try {
    const blob = await getImageBlob(card.id);
    if (blob) return await blobToBase64(blob);

    if (card.imagePath) {
      const downloaded = await CardRepository.downloadImage(card.imagePath);
      try {
        await cacheImageBlob(card.id, downloaded);
      } catch (_) {
        // La caché local es opcional: si falla, se sigue con la imagen descargada.
      }
      return await blobToBase64(downloaded);
    }
    if (card.image) {
      if (card.image.startsWith('http://') || card.image.startsWith('https://') || card.image.startsWith('blob:')) {
        return await urlToBase64(card.image);
      }
      if (card.image.startsWith('data:')) return card.image;
    }
  } catch (error) {
    logger.error(`Error getting image for card ${card.id}:`, error);
  }
  return null;
};
