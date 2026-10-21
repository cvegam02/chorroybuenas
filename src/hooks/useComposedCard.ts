import { useEffect, useState } from 'react';
import type { Card } from '../types';
import { composeCard } from '../services/cardCompose/compose';
import { createComposedCardStore } from '../services/cardCompose/composedCards';
import { readStoredCardImage } from '../services/cardImage';
import { useCardLabels } from '../contexts/CardLabelsContext';
import { labeledForCompose } from '../utils/cardLabels';

const store = createComposedCardStore({ readImage: readStoredCardImage, compose: composeCard });
/** Cuántas cartas en pantalla usan el almacén: al quedar en cero se vacía, para soltar la memoria. */
let cardsOnScreen = 0;

/**
 * La carta como va a salir impresa (foto, marco, nombre y número según el ajuste de la lotería), para mostrarla en pantalla.
 * Devuelve `null` mientras se compone, si no se pudo componer o si `enabled` es falso: ahí quien la usa
 * muestra la foto.
 */
export const useComposedCard = (shownCard: Card | null, enabled: boolean = true): string | null => {
  // Con el nombre y el número que pide el ajuste de la lotería (FEAT-51).
  const cardLabels = useCardLabels();
  const card = shownCard && labeledForCompose(shownCard, cardLabels);
  const id = card?.id;
  const title = card?.title;
  const image = card?.image;
  const isAiGenerated = card?.isAiGenerated;
  const imagePath = card?.imagePath;
  const number = card?.number;
  const [composed, setComposed] = useState<{ card: Card; url: string | null } | null>(null);

  useEffect(() => {
    cardsOnScreen++;
    return () => {
      cardsOnScreen--;
      if (cardsOnScreen === 0) store.clear();
    };
  }, []);

  useEffect(() => {
    if (!enabled || id === undefined || title === undefined) return;

    let cancelled = false;
    const current: Card = { id, title, image, isAiGenerated, imagePath, number };
    store.get(current).then((url) => {
      if (!cancelled) setComposed({ card: current, url });
    });
    return () => {
      cancelled = true;
    };
  }, [enabled, id, title, image, isAiGenerated, imagePath, number]);

  if (!enabled || !card) return null;

  // Lo guardado puede ser de la carta anterior (al pasar de un tablero a otro): solo vale si es de esta.
  const isCurrent =
    composed !== null &&
    composed.card.id === id &&
    composed.card.title === title &&
    composed.card.image === image &&
    composed.card.isAiGenerated === isAiGenerated &&
    composed.card.imagePath === imagePath &&
    composed.card.number === number;
  return isCurrent ? composed.url : store.peek(card);
};
