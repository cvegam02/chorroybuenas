import type { Card } from '../../types';
import { logger } from '../../utils/logger';
import { composeInputFor, type CardComposer } from './input';

export interface ComposedCardStoreOptions {
  /** La imagen guardada de la carta, o `null` si no se pudo leer. */
  readImage: (card: Card) => Promise<string | null>;
  compose: CardComposer;
}

/** Una data URL es larguísima: para distinguir una imagen de otra bastan su largo y su final. */
const imageKey = (image: string | undefined): string => {
  if (!image) return '';
  return image.startsWith('data:') ? `${image.length}:${image.slice(-32)}` : image;
};

/** Una imagen que vive en el navegador (no hay que descargarla). */
const isLocalImage = (image: string | undefined): image is string =>
  !!image && (image.startsWith('blob:') || image.startsWith('data:'));

const keyOf = (card: Card): string =>
  [card.id, card.title, card.isAiGenerated ? 'ia' : 'foto', imageKey(card.image)].join('|');

/**
 * Cartas compuestas para mostrarse en pantalla. Cada carta se compone una vez y se reutiliza mientras no
 * cambien su nombre ni su foto. La que no se puede componer da `null` y no se guarda, para poder reintentar.
 */
export const createComposedCardStore = ({ readImage, compose }: ComposedCardStoreOptions) => {
  const pending = new Map<string, Promise<string | null>>();
  const ready = new Map<string, string>();

  /**
   * Primero se intenta con la imagen que la pantalla ya muestra, si es local: es la más reciente. Si no sirve
   * (una dirección local ya caducada) o es remota, se usa la copia guardada.
   */
  const composeFromBestSource = async (card: Card): Promise<string | null> => {
    const shown = isLocalImage(card.image) ? card.image : null;
    if (shown) {
      const composed = await compose(composeInputFor(card, shown)).catch(() => null);
      if (composed !== null) return composed;
    }

    const photo = (await readImage(card)) ?? card.image;
    if (!photo || photo === shown) return null;
    return compose(composeInputFor(card, photo));
  };

  const composeCard = async (card: Card, key: string): Promise<string | null> => {
    try {
      const composed = await composeFromBestSource(card);
      // Si entretanto se vació el almacén, este resultado ya no se guarda.
      if (composed !== null && pending.has(key)) ready.set(key, composed);
      return composed;
    } catch (error) {
      logger.error(`No se pudo componer la carta ${card.id} para mostrarla:`, error);
      return null;
    }
  };

  return {
    /** La carta compuesta si ya está lista; `null` si todavía no. */
    peek: (card: Card): string | null => ready.get(keyOf(card)) ?? null,

    get: (card: Card): Promise<string | null> => {
      const key = keyOf(card);
      const started = pending.get(key);
      if (started) return started;

      const composing = composeCard(card, key).then((composed) => {
        if (composed === null && pending.get(key) === composing) pending.delete(key);
        return composed;
      });
      pending.set(key, composing);
      return composing;
    },

    clear: () => {
      pending.clear();
      ready.clear();
    },
  };
};
