import { createContext, useContext } from 'react';
import { DEFAULT_CARD_LABELS, type CardLabels } from '../utils/cardLabels';

/**
 * Qué se ve en las cartas de la lotería que se está armando (FEAT-51). Fuera de las pantallas de Crear no
 * hay proveedor y las cartas se dibujan con nombre y número, como siempre.
 */
const CardLabelsContext = createContext<CardLabels>(DEFAULT_CARD_LABELS);

export const CardLabelsProvider = CardLabelsContext.Provider;

export const useCardLabels = (): CardLabels => useContext(CardLabelsContext);
