import type { GridSize } from '../types';
import type { CardLabels } from './cardLabels';
import { minCardsForGrid } from './gridRules';

/**
 * Una partida del cantador (FEAT-55): el orden revuelto de las cartas y cuántas ya salieron.
 * La carta que se ve es la última sacada. Las funciones no cambian la partida que reciben: devuelven otra.
 */
export interface CallerGame {
  /** Los ids de las cartas, en el orden en que van a salir. */
  order: string[];
  /** Cuántas ya salieron, desde el principio de `order`. */
  drawn: number;
}

/** Se puede cantar con el mínimo de cartas del modo, tenga tableros o no (decisión 7). */
export const canSing = (cardCount: number, gridSize: GridSize): boolean => cardCount >= minCardsForGrid(gridSize);

/** El nombre va debajo de la carta solo si la carta no lo trae dibujado (decisión 5). */
export const nameGoesBelow = (labels: CardLabels): boolean => labels === 'number' || labels === 'none';

const shuffled = (items: string[], random: () => number): string[] => {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

export const newGame = (cardIds: string[], random: () => number = Math.random): CallerGame => ({
  order: shuffled(cardIds, random),
  drawn: 0,
});

export const isFinished = (game: CallerGame): boolean => game.drawn >= game.order.length;

export const drawNext = (game: CallerGame): CallerGame => (isFinished(game) ? game : { ...game, drawn: game.drawn + 1 });

export const currentCardId = (game: CallerGame): string | null => (game.drawn === 0 ? null : game.order[game.drawn - 1]);

/** Las cartas cantadas, en el orden en que salieron. */
export const drawnIds = (game: CallerGame): string[] => game.order.slice(0, game.drawn);

/**
 * Ajusta la partida a las cartas que tiene hoy la lotería: las borradas dejan de salir y las nuevas entran,
 * cada una en un lugar al azar entre las que faltan. Las ya cantadas no se mueven.
 */
export const reconcileGame = (game: CallerGame, cardIds: string[], random: () => number = Math.random): CallerGame => {
  const current = new Set(cardIds);
  const kept = game.order.filter((id) => current.has(id));
  const removedDrawn = drawnIds(game).filter((id) => !current.has(id)).length;
  const drawn = game.drawn - removedDrawn;
  const known = new Set(game.order);
  const added = cardIds.filter((id) => !known.has(id));
  if (added.length === 0 && kept.length === game.order.length) return game;

  const order = [...kept];
  for (const id of added) {
    const remaining = order.length - drawn;
    order.splice(drawn + Math.floor(random() * (remaining + 1)), 0, id);
  }
  return { order, drawn };
};

/** Lee la partida guardada en el navegador; cualquier cosa que no sea una partida válida, null. */
export const parseSavedGame = (raw: string | null): CallerGame | null => {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== 'object' || value === null) return null;
    const { order, drawn } = value as Record<string, unknown>;
    if (!Array.isArray(order) || !order.every((id) => typeof id === 'string')) return null;
    if (new Set(order).size !== order.length) return null;
    if (typeof drawn !== 'number' || !Number.isInteger(drawn) || drawn < 0 || drawn > order.length) return null;
    return { order: order as string[], drawn };
  } catch {
    return null;
  }
};

/**
 * Recorrer las cartas ya cantadas con las flechas (decisión 19). `view` es el lugar de la carta que se ve
 * (desde 0) o null si se ve la última cantada. ← va a la anterior y no pasa de la primera.
 */
export const browseBack = (view: number | null, drawn: number): number | null => {
  const from = view ?? drawn - 1;
  if (from <= 0) return view;
  return from - 1;
};

/** → avanza hasta la última cantada (null) y no saca cartas nuevas. */
export const browseForward = (view: number | null, drawn: number): number | null => {
  if (view === null || view + 1 >= drawn - 1) return null;
  return view + 1;
};

/** La tira del historial (US A3): las últimas `limit` cantadas antes de la actual, de la más vieja a la más reciente. */
export const recentBeforeCurrent = (game: CallerGame, limit: number): string[] =>
  game.order.slice(Math.max(0, game.drawn - 1 - limit), Math.max(0, game.drawn - 1));

/** El número de salida de cada carta cantada (la primera es 1), para «Ver todas». */
export const callOrderNumbers = (game: CallerGame): Map<string, number> =>
  new Map(drawnIds(game).map((id, index) => [id, index + 1]));
