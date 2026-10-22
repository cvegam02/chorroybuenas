/**
 * «Arma tus tableros» (FEAT-53, docs/contexto-negocio.md §19): tableros personalizados con las 54 cartas
 * tradicionales, para jugar con la baraja de siempre. Reglas sin estado.
 * Cada tablero guarda los números de sus cartas (1 a 54) en el orden de sus casillas; `null` es una casilla
 * vacía (US A3). `fixed` son las cartas fijadas: al revolver no se mueven, y si se cambian de casilla a mano
 * siguen fijadas.
 */

import type { Board, GridSize } from '../types';
import { TRADITIONAL_DECK } from './traditionalDeck';
import { newUuid } from './newUuid';

export const TRADITIONAL_CARD_COUNT = 54;
export const TRADITIONAL_MAX_BOARDS = 50;

/** Intentos por tablero para encontrar uno que no repita a los demás. */
const MAX_ATTEMPTS = 1000;

export type TraditionalCell = number | null;

export interface TraditionalBoard {
  id: string;
  cards: TraditionalCell[];
  fixed: number[];
}

export interface TraditionalState {
  gridSize: GridSize;
  boards: TraditionalBoard[];
}

export const emptyTraditionalState = (): TraditionalState => ({ gridSize: 16, boards: [] });

/** La versión ligera es para la pantalla; la de buena calidad, para el PDF (decisión 12). */
export const traditionalCardImage = (card: number, quality: 'screen' | 'print'): string =>
  `/media/loteria-tradicional/${quality === 'screen' ? 'pantalla' : 'impresion'}/${String(card).padStart(2, '0')}.jpg`;

const isCard = (value: unknown): value is number =>
  Number.isInteger(value) && (value as number) >= 1 && (value as number) <= TRADITIONAL_CARD_COUNT;

const isComplete = (cards: readonly TraditionalCell[]): cards is number[] => cards.every((card) => card !== null);

/** Las mismas cartas en otro orden cuentan como el mismo tablero. Solo tiene sentido con el tablero lleno. */
const boardKey = (cards: readonly TraditionalCell[]): string =>
  [...cards].sort((a, b) => (a ?? 0) - (b ?? 0)).join('|');

function shuffled(values: readonly number[]): number[] {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** Las cartas fijadas se quedan en su casilla; las demás casillas, vacías o no, se llenan al azar. */
function fillAround(cards: readonly TraditionalCell[], fixed: readonly number[], gridSize: GridSize): number[] {
  const kept = cards.slice(0, gridSize).map((card) => (card !== null && fixed.includes(card) ? card : null));
  const free = Array.from({ length: TRADITIONAL_CARD_COUNT }, (_, i) => i + 1).filter((card) => !kept.includes(card));
  const pool = shuffled(free);
  return Array.from({ length: gridSize }, (_, cell) => kept[cell] ?? (pool.pop() as number));
}

/** Un acomodo al azar que no esté en `taken`. Con 54 cartas casi nunca hace falta un segundo intento. */
function freshCards(
  gridSize: GridSize,
  taken: ReadonlySet<string>,
  current: readonly TraditionalCell[] = [],
  fixed: readonly number[] = [],
): number[] {
  let cards = fillAround(current, fixed, gridSize);
  for (let attempts = 0; taken.has(boardKey(cards)) && attempts < MAX_ATTEMPTS; attempts++) {
    cards = fillAround(current, fixed, gridSize);
  }
  return cards;
}

const takenKeys = (boards: readonly TraditionalBoard[]) =>
  new Set(boards.filter((board) => isComplete(board.cards)).map((board) => boardKey(board.cards)));

/** Agrega hasta `count` tableros al azar, sin pasar del máximo. Si no cabe ninguno, devuelve la misma lista. */
export function addRandomBoards(
  boards: readonly TraditionalBoard[],
  count: number,
  gridSize: GridSize,
): TraditionalBoard[] {
  const room = Math.min(Math.floor(count), TRADITIONAL_MAX_BOARDS - boards.length);
  if (room <= 0) return boards as TraditionalBoard[];

  const taken = takenKeys(boards);
  const added: TraditionalBoard[] = [];
  for (let i = 0; i < room; i++) {
    const cards = freshCards(gridSize, taken);
    taken.add(boardKey(cards));
    added.push({ id: newUuid(), cards, fixed: [] });
  }
  return [...boards, ...added];
}

/** «Tablero vacío» (US A3): todas sus casillas sin carta, para llenarlo a mano. */
export function addEmptyBoard(boards: readonly TraditionalBoard[], gridSize: GridSize): TraditionalBoard[] {
  if (boards.length >= TRADITIONAL_MAX_BOARDS) return boards as TraditionalBoard[];
  return [...boards, { id: newUuid(), cards: Array<TraditionalCell>(gridSize).fill(null), fixed: [] }];
}

/** La página empieza con un tablero vacío, para elegir las cartas a mano (decisión 21). */
export const startingTraditionalState = (gridSize: GridSize): TraditionalState => ({
  gridSize,
  boards: addEmptyBoard([], gridSize),
});

/** Si ya hay alguna carta puesta: un juego sin cartas no se guarda en la cuenta ni se ofrece pasar a ella. */
export const hasPlacedCards = (boards: readonly TraditionalBoard[]): boolean =>
  boards.some((board) => board.cards.some((card) => card !== null));

/** Revuelve un tablero: sus fijadas se quedan y lo demás cambia, distinto de los otros tableros. */
export function reshuffleBoard(
  boards: readonly TraditionalBoard[],
  id: string,
  gridSize: GridSize,
): TraditionalBoard[] {
  const taken = takenKeys(boards);
  return boards.map((board) =>
    board.id === id ? { ...board, cards: freshCards(gridSize, taken, board.cards, board.fixed) } : board,
  );
}

/** Revuelve todos: misma cantidad, mismos identificadores y fijadas, sin dos iguales. */
export function reshuffleAll(boards: readonly TraditionalBoard[], gridSize: GridSize): TraditionalBoard[] {
  const taken = new Set<string>();
  return boards.map((board) => {
    const cards = freshCards(gridSize, taken, board.cards, board.fixed);
    taken.add(boardKey(cards));
    return { ...board, cards };
  });
}

export const removeBoard = (boards: readonly TraditionalBoard[], id: string): TraditionalBoard[] =>
  boards.filter((board) => board.id !== id);

const inBoard = (board: TraditionalBoard | undefined, cell: number): board is TraditionalBoard =>
  board !== undefined && Number.isInteger(cell) && cell >= 0 && cell < board.cards.length;

/** Intercambia dos casillas de un tablero (US A2). Si no hay nada que cambiar, devuelve la misma lista. */
export function swapCells(
  boards: readonly TraditionalBoard[],
  id: string,
  from: number,
  to: number,
): TraditionalBoard[] {
  const target = boards.find((board) => board.id === id);
  if (from === to || !inBoard(target, from) || !inBoard(target, to)) return boards as TraditionalBoard[];

  const cards = [...target.cards];
  [cards[from], cards[to]] = [cards[to], cards[from]];
  return boards.map((board) => (board.id === id ? { ...board, cards } : board));
}

/**
 * Pone una carta en una casilla (US A2). Una carta no se repite en un tablero: si ya está en otra casilla,
 * las dos casillas se intercambian. La carta reemplazada deja de estar fijada.
 */
export function placeCard(
  boards: readonly TraditionalBoard[],
  id: string,
  cell: number,
  card: number,
): TraditionalBoard[] {
  const target = boards.find((board) => board.id === id);
  if (!inBoard(target, cell) || !isCard(card) || target.cards[cell] === card) return boards as TraditionalBoard[];

  const current = target.cards.indexOf(card);
  if (current !== -1) return swapCells(boards, id, cell, current);

  const replaced = target.cards[cell];
  const cards = target.cards.map((value, index) => (index === cell ? card : value));
  const fixed = target.fixed.filter((value) => value !== replaced);
  return boards.map((board) => (board.id === id ? { id, cards, fixed } : board));
}

/** Fija o suelta la carta de una casilla (US A3). Una casilla vacía no se fija. */
export function toggleFixed(boards: readonly TraditionalBoard[], id: string, cell: number): TraditionalBoard[] {
  const target = boards.find((board) => board.id === id);
  const card = inBoard(target, cell) ? target.cards[cell] : null;
  if (!target || card === null) return boards as TraditionalBoard[];

  const fixed = target.fixed.includes(card) ? target.fixed.filter((value) => value !== card) : [...target.fixed, card];
  return boards.map((board) => (board.id === id ? { ...board, fixed } : board));
}

/**
 * Para avisar de tableros iguales hechos a mano: por tablero, los números (desde 1) de los otros iguales a él.
 * Los tableros con casillas vacías no cuentan.
 */
export function duplicateBoardNumbers(boards: readonly TraditionalBoard[]): Map<string, number[]> {
  const byKey = new Map<string, number[]>();
  boards.forEach((board, index) => {
    if (!isComplete(board.cards)) return;
    const key = boardKey(board.cards);
    byKey.set(key, [...(byKey.get(key) ?? []), index]);
  });

  const result = new Map<string, number[]>();
  for (const indexes of byKey.values()) {
    if (indexes.length < 2) continue;
    for (const index of indexes) {
      result.set(boards[index].id, indexes.filter((other) => other !== index).map((other) => other + 1));
    }
  }
  return result;
}

/** Números (desde 1) de los tableros con casillas vacías: con ellos no se descarga el PDF (US A4). */
export const incompleteBoardNumbers = (boards: readonly TraditionalBoard[]): number[] =>
  boards.flatMap((board, index) => (isComplete(board.cards) ? [] : [index + 1]));

/** «Llenar al azar las vacías» (US A4): solo cambian las casillas vacías; todo lo ya puesto se queda. */
export function fillEmptyCells(boards: readonly TraditionalBoard[], gridSize: GridSize): TraditionalBoard[] {
  if (incompleteBoardNumbers(boards).length === 0) return boards as TraditionalBoard[];

  const taken = takenKeys(boards);
  return boards.map((board) => {
    if (isComplete(board.cards)) return board;
    const placed = board.cards.filter((card): card is number => card !== null);
    const cards = freshCards(gridSize, taken, board.cards, placed);
    taken.add(boardKey(cards));
    return { ...board, cards };
  });
}

/** «Llenar al azar» de un tablero (decisión 21): solo sus casillas vacías; lo puesto se queda. */
export function fillBoardEmptyCells(
  boards: readonly TraditionalBoard[],
  id: string,
  gridSize: GridSize,
): TraditionalBoard[] {
  const target = boards.find((board) => board.id === id);
  if (!target || isComplete(target.cards)) return boards as TraditionalBoard[];

  const placed = target.cards.filter((card): card is number => card !== null);
  const cards = freshCards(gridSize, takenKeys(boards), target.cards, placed);
  return boards.map((board) => (board.id === id ? { ...board, cards } : board));
}

/**
 * Los tableros como los pide el PDF del sitio: cada carta con su nombre y su imagen de impresión, ya con el
 * nombre dibujado. `origin` es la dirección del sitio, porque el PDF descarga las imágenes por URL completa.
 */
export function traditionalPdfBoards(boards: readonly TraditionalBoard[], gridSize: GridSize, origin: string): Board[] {
  return boards.map((board) => {
    if (!isComplete(board.cards)) throw new Error(`El tablero ${board.id} tiene casillas vacías`);
    return {
      id: board.id,
      gridSize,
      cards: board.cards.map((card) => ({
        id: `tradicional-${String(card).padStart(2, '0')}`,
        title: TRADITIONAL_DECK[card - 1],
        image: `${origin}${traditionalCardImage(card, 'print')}`,
      })),
    };
  });
}

const isGridSize = (value: unknown): value is GridSize => value === 9 || value === 16;

/** Un tablero guardado, si es válido: casillas del tamaño del modo, cartas de 1 a 54 sin repetirse. */
function readBoard(value: unknown, gridSize: GridSize): TraditionalBoard | null {
  if (typeof value !== 'object' || value === null) return null;
  const { id, cards, fixed } = value as Record<string, unknown>;
  if (typeof id !== 'string' || id === '' || !Array.isArray(cards) || cards.length !== gridSize) return null;
  if (!cards.every((card) => card === null || isCard(card))) return null;
  const placed = cards.filter(isCard);
  if (new Set(placed).size !== placed.length) return null;

  // Lo guardado antes de US A3 no tiene fijadas.
  const keptFixed = Array.isArray(fixed) ? fixed.filter((card): card is number => isCard(card) && placed.includes(card)) : [];
  return { id, cards: [...(cards as TraditionalCell[])], fixed: [...new Set(keptFixed)] };
}

/** Lo guardado en el navegador puede venir dañado: se conservan solo los tableros válidos, hasta 50. */
export function parseTraditionalState(raw: string | null): TraditionalState {
  if (raw === null) return emptyTraditionalState();
  try {
    const data: unknown = JSON.parse(raw);
    const { gridSize, boards } = (data ?? {}) as Record<string, unknown>;
    if (!isGridSize(gridSize) || !Array.isArray(boards)) return emptyTraditionalState();
    const valid = boards
      .map((board) => readBoard(board, gridSize))
      .filter((board): board is TraditionalBoard => board !== null)
      .slice(0, TRADITIONAL_MAX_BOARDS);
    return { gridSize, boards: valid };
  } catch {
    return emptyTraditionalState();
  }
}
