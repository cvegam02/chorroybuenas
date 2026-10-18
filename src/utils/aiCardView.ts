/**
 * Cómo se ven las cartas del modo «Generar con IA» en la cuadrícula (FEAT-50, US A6, decisión 15): el estado
 * de cada carta, los filtros y el paso de carta con las flechas. Sin red, para probarlo solo.
 */

interface ViewCard {
  id: string;
  chosenAttemptId: string | null;
  scene: string;
}

export type AiCardStatus = 'generating' | 'error' | 'ready' | 'pending';

export const AI_CARD_FILTERS = ['all', 'noScene', 'pending', 'ready', 'error'] as const;
export type AiCardFilter = (typeof AI_CARD_FILTERS)[number];

/** Generando manda sobre todo; un error (aunque haya un intento anterior) manda sobre lista. */
export const aiCardStatus = (
  card: ViewCard,
  generating: ReadonlySet<string>,
  errors: ReadonlyMap<string, string>,
): AiCardStatus => {
  if (generating.has(card.id)) return 'generating';
  if (errors.has(card.id)) return 'error';
  return card.chosenAttemptId ? 'ready' : 'pending';
};

export const hasNoScene = (card: ViewCard) => card.scene.trim() === '';

const matches = (card: ViewCard, status: AiCardStatus, filter: AiCardFilter): boolean => {
  switch (filter) {
    case 'all':
      return true;
    case 'noScene':
      return hasNoScene(card);
    // «Sin generar» incluye las que se están generando: todavía no tienen carta.
    case 'pending':
      return status === 'pending' || status === 'generating';
    case 'ready':
      return status === 'ready';
    case 'error':
      return status === 'error';
  }
};

/** Las cartas de un filtro, en el orden de la lista. */
export const filterAiCards = <T extends ViewCard>(
  cards: readonly T[],
  filter: AiCardFilter,
  generating: ReadonlySet<string>,
  errors: ReadonlyMap<string, string>,
): T[] => cards.filter((card) => matches(card, aiCardStatus(card, generating, errors), filter));

export const countAiCardFilters = (
  cards: readonly ViewCard[],
  generating: ReadonlySet<string>,
  errors: ReadonlyMap<string, string>,
): Record<AiCardFilter, number> => {
  const counts = Object.fromEntries(AI_CARD_FILTERS.map((filter) => [filter, 0])) as Record<AiCardFilter, number>;
  for (const card of cards) {
    const status = aiCardStatus(card, generating, errors);
    for (const filter of AI_CARD_FILTERS) if (matches(card, status, filter)) counts[filter] += 1;
  }
  return counts;
};

/** La carta de al lado entre las que se ven; null en las orillas o si la carta ya no se ve. */
export const neighborCardId = (shown: readonly { id: string }[], id: string, step: 1 | -1): string | null => {
  const index = shown.findIndex((card) => card.id === id);
  if (index < 0) return null;
  return shown[index + step]?.id ?? null;
};
