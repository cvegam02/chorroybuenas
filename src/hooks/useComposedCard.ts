import { useEffect, useState } from 'react';
import type { Card } from '../types';
import { composeCard } from '../services/cardCompose/compose';
import { createComposedCardStore } from '../services/cardCompose/composedCards';
import { readStoredCardImage } from '../services/cardImage';

const store = createComposedCardStore({ readImage: readStoredCardImage, compose: composeCard });
/** Cuántas cartas en pantalla usan el almacén: al quedar en cero se vacía, para soltar la memoria. */
let cardsOnScreen = 0;

/**
 * La carta como va a salir impresa (foto, marco y nombre dentro de la imagen), para mostrarla en pantalla.
 * Devuelve `null` mientras se compone, si no se pudo componer o si `enabled` es falso: ahí quien la usa
 * muestra la foto.
 */
export const useComposedCard = (card: Card | null, enabled: boolean = true): string | null => {
  const id = card?.id;
  const title = card?.title;
  const image = card?.image;
  const isAiGenerated = card?.isAiGenerated;
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
    const current: Card = { id, title, image, isAiGenerated };
    store.get(current).then((url) => {
      if (!cancelled) setComposed({ card: current, url });
    });
    return () => {
      cancelled = true;
    };
  }, [enabled, id, title, image, isAiGenerated]);

  if (!enabled || !card) return null;

  // Lo guardado puede ser de la carta anterior (al pasar de un tablero a otro): solo vale si es de esta.
  const isCurrent =
    composed !== null &&
    composed.card.id === id &&
    composed.card.title === title &&
    composed.card.image === image &&
    composed.card.isAiGenerated === isAiGenerated;
  return isCurrent ? composed.url : store.peek(card);
};
