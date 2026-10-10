import type { Card } from '../../types';
import { logger } from '../../utils/logger';
import { composeInputFor, type CardComposer } from '../cardCompose/input';
import { createOnceLoader } from './loadOnce';

export interface CardPreparerOptions {
  /** La imagen guardada de la carta, o `null` si no se pudo leer. */
  readImage: (card: Card) => Promise<string | null>;
  compose: CardComposer;
  /** Cartas que ya traen su nombre dibujado (lotería de temporada): no se componen. */
  finishedCards: boolean;
}

/**
 * Deja cada carta con la imagen que va al PDF: la foto normal, compuesta con marco y nombre; la convertida
 * con IA, entera y con su nombre encima. Cada carta se compone una sola vez, aunque salga en varios tableros.
 * La que no se puede componer se queda sin imagen, para que cuente como fallida.
 */
export const createCardPreparer = ({ readImage, compose, finishedCards }: CardPreparerOptions) => {
  const composeOnce = createOnceLoader<string>();

  return async (card: Card): Promise<Card> => {
    const stored = await readImage(card);
    const photo = stored ?? card.image;
    if (finishedCards || !photo) return stored ? { ...card, image: stored } : card;

    const composeThis = () => compose(composeInputFor(card, photo));

    try {
      const image = card.id ? await composeOnce(card.id, composeThis) : await composeThis();
      return { ...card, image: image ?? undefined };
    } catch (error) {
      logger.error(`PDF: no se pudo componer la carta ${card.id}:`, error);
      return { ...card, image: undefined };
    }
  };
};
