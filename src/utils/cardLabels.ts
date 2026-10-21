import type { Card } from '../types';

/**
 * Qué se ve en las cartas de una lotería (FEAT-51): nombre y número, solo nombre, solo número o nada.
 * Es un solo ajuste por lotería; sirve para fotos que ya traen su nombre y su número.
 */
export type CardLabels = 'both' | 'name' | 'number' | 'none';

export const CARD_LABELS: readonly CardLabels[] = ['both', 'name', 'number', 'none'];

export const DEFAULT_CARD_LABELS: CardLabels = 'both';

const isCardLabels = (value: unknown): value is CardLabels => CARD_LABELS.includes(value as CardLabels);

/** El ajuste guardado, o nombre y número si falta o no se reconoce. */
export const cardLabelsOrDefault = (value: unknown): CardLabels => (isCardLabels(value) ? value : DEFAULT_CARD_LABELS);

/**
 * La carta como se compone con el ajuste: sin nombre, el título queda vacío y el compositor no lo dibuja;
 * sin número, no lleva número. Solo es para dibujarla: no se guarda.
 */
export const labeledForCompose = <T extends Card>(card: T, labels: CardLabels): T => ({
  ...card,
  ...(labels === 'number' || labels === 'none' ? { title: '' } : {}),
  ...(labels === 'name' || labels === 'none' ? { number: undefined } : {}),
});
