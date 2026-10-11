/**
 * Ventana de IA en lote (FEAT-34, US A6): la cuenta que se muestra antes de empezar y qué cartas entran.
 * Aquí no se cobra nada: el token lo cobra el servidor al transformar cada foto, y lo devuelve si falla.
 */

/** Cada foto transformada usa 1 token. */
const TOKENS_PER_PHOTO = 1;

export interface AiBatchPlan {
  /** Fotos que se van a transformar. */
  photos: number;
  /** Tokens que se usan. */
  tokens: number;
  /** Saldo que queda al terminar; `null` mientras no se conoce el saldo. */
  balanceAfter: number | null;
  hasEnough: boolean;
  /** Tokens que faltan para este lote; 0 si alcanzan o si el saldo no se conoce. */
  missing: number;
  /** Cartas pendientes para las que sí alcanza el saldo. */
  affordable: number;
}

const isValidLimit = (limit: unknown): limit is number =>
  typeof limit === 'number' && Number.isInteger(limit) && limit > 0;

/**
 * Las cartas que entran al lote: todas las pendientes o, con `limit`, las primeras en el orden de la baraja.
 * Un límite que no es un entero positivo no transforma nada: ante la duda no se gasta ningún token.
 */
export function cardsForBatch<T>(pending: readonly T[], limit?: number): T[] {
  if (limit === undefined) return [...pending];
  return isValidLimit(limit) ? pending.slice(0, limit) : [];
}

export function aiBatchPlan(pendingCards: number, tokenBalance: number | null, limit?: number): AiBatchPlan {
  const photos = limit === undefined ? pendingCards : Math.min(pendingCards, isValidLimit(limit) ? limit : 0);
  const tokens = photos * TOKENS_PER_PHOTO;

  if (tokenBalance === null) {
    return { photos, tokens, balanceAfter: null, hasEnough: false, missing: 0, affordable: 0 };
  }

  const balance = Math.max(0, Math.floor(tokenBalance));
  return {
    photos,
    tokens,
    balanceAfter: balance - tokens,
    hasEnough: balance >= tokens,
    missing: Math.max(0, tokens - balance),
    affordable: Math.min(pendingCards, Math.floor(balance / TOKENS_PER_PHOTO)),
  };
}

export type BatchCardState = 'done' | 'rejected' | 'current' | 'pending';

/**
 * Cómo va una carta del lote. Una que ya pasó y quedó sin IA fue rechazada por el filtro de contenido:
 * cualquier otro error detiene el lote ahí mismo.
 */
export function batchCardState(index: number, currentIndex: number, isAiGenerated: boolean): BatchCardState {
  if (index < currentIndex) return isAiGenerated ? 'done' : 'rejected';
  return index === currentIndex ? 'current' : 'pending';
}
