/**
 * Cartas guardadas de una lotería temática y el acomodo de sus tableros (FEAT-48, decisión 18). Lo que llega
 * de la base se revisa antes de usarlo; la base guarda los tableros como posiciones dentro de la lista de cartas.
 */
import type { GridSize } from '../types';
import { SEASONAL_EXPECTED_CARDS, hasEnoughCards, seasonalMinCards } from './seasonalCards';

export interface StoredCard {
  /** Ruta dentro del espacio privado de cartas. */
  path: string;
  /** Nombre del archivo que subió el administrador. */
  fileName: string;
  /** No venía en 2:3: se usa completa, con franjas blancas. */
  offRatio: boolean;
  /** Elegida en la Vitrina como portada o como muestra (FEAT-48, decisión 13). */
  role?: ShowcaseRole;
  /** Su copia reducida y con marca de agua, ya subida a las vistas previas. */
  previewPath?: string;
}

export type ShowcaseRole = 'cover' | 'sample';

export interface SeasonalBuild {
  cards: StoredCard[];
  /** En cada tablero, la posición de cada carta en `cards`. */
  boards: number[][];
  /** El PDF guardado se armó con estas cartas y estos tableros. */
  pdfIsCurrent: boolean;
}

export const EMPTY_BUILD: SeasonalBuild = { cards: [], boards: [], pdfIsCurrent: false };

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

function readCard(value: unknown): StoredCard | null {
  if (!isRecord(value) || typeof value.path !== 'string' || value.path === '') return null;
  return {
    path: value.path,
    fileName: typeof value.fileName === 'string' ? value.fileName : '',
    offRatio: value.offRatio === true,
    ...(value.role === 'cover' || value.role === 'sample' ? { role: value.role } : {}),
    ...(typeof value.previewPath === 'string' && value.previewPath !== '' ? { previewPath: value.previewPath } : {}),
  };
}

/** Lo guardado en la base → lo que usa el asistente. Unos tableros que no cuadran con las cartas se descartan. */
export function readBuild(row: { cards: unknown; boards: unknown; pdf_is_current: unknown } | null): SeasonalBuild {
  if (!row) return EMPTY_BUILD;
  const cards = Array.isArray(row.cards) ? row.cards.map(readCard) : [];
  if (cards.some((card) => card === null)) return EMPTY_BUILD;
  const validCards = cards as StoredCard[];
  const boards = Array.isArray(row.boards) ? row.boards : [];
  const boardsFit = boards.every(
    (board) =>
      Array.isArray(board) &&
      board.length > 0 &&
      board.every((index) => Number.isInteger(index) && index >= 0 && index < validCards.length),
  );
  return {
    cards: validCards,
    boards: boardsFit ? (boards as number[][]) : [],
    pdfIsCurrent: boardsFit && boards.length > 0 && row.pdf_is_current === true,
  };
}

/** Tableros de cartas → posiciones de cada carta en la lista. */
export function boardsToIndexes<T>(boards: readonly (readonly T[])[], cards: readonly T[]): number[][] {
  return boards.map((board) => board.map((card) => cards.indexOf(card)));
}

/** Posiciones → tableros de cartas. */
export function boardsFromIndexes<T>(boards: readonly (readonly number[])[], cards: readonly T[]): T[][] {
  return boards.map((board) => board.map((index) => cards[index]));
}

/** «Ya puedes seguir: el mínimo en Clásico es 24», o cuántas faltan para el mínimo. */
export function cardCountMessage(count: number, gridSize: GridSize): string {
  const mode = gridSize === 9 ? 'Kids' : 'Clásico';
  const min = seasonalMinCards(gridSize);
  if (hasEnoughCards(count, gridSize)) return `Ya puedes seguir: el mínimo en ${mode} es ${min}`;
  const missing = min - count;
  return `${missing === 1 ? 'Falta 1 carta' : `Faltan ${missing} cartas`} para el mínimo en ${mode}, que es ${min}`;
}

/** El avance de la barra, de 0 a 1, contra las 54 de una lotería tradicional. */
export const cardProgress = (count: number): number => Math.min(1, count / SEASONAL_EXPECTED_CARDS);

/** «La carta 14 no viene en 2:3: se usará completa, con franjas blancas.» Los números son su lugar en la lista. */
export function offRatioNotice(cards: readonly { offRatio: boolean }[]): string | null {
  const numbers = cards.flatMap((card, index) => (card.offRatio ? [index + 1] : []));
  if (numbers.length === 0) return null;
  if (numbers.length === 1) return `La carta ${numbers[0]} no viene en 2:3: se usará completa, con franjas blancas.`;
  const list = `${numbers.slice(0, -1).join(', ')} y ${numbers[numbers.length - 1]}`;
  return `Las cartas ${list} no vienen en 2:3: se usarán completas, con franjas blancas.`;
}

/* Vitrina (FEAT-48, decisiones 13 y 19) */

type ShowcaseCard = Pick<StoredCard, 'role'>;

const withRole = <T extends ShowcaseCard>(card: T, role: ShowcaseRole | undefined): T => {
  const copy = { ...card };
  delete copy.role;
  return role ? { ...copy, role } : copy;
};

/** La carta que hace de portada: la marcada, o la primera si no hay otra portada subida aparte. */
export function coverIndex(cards: readonly ShowcaseCard[], hasOwnCover: boolean): number | null {
  const marked = cards.findIndex((card) => card.role === 'cover');
  if (marked >= 0) return marked;
  return hasOwnCover || cards.length === 0 ? null : 0;
}

/** Las muestras, en el orden de las cartas. La portada no cuenta como muestra. */
export function sampleIndexes(cards: readonly ShowcaseCard[], cover: number | null): number[] {
  return cards.flatMap((card, index) => (card.role === 'sample' && index !== cover ? [index] : []));
}

/** Marca o desmarca una carta como muestra. La portada no se toca. */
export function toggleSample<T extends ShowcaseCard>(cards: readonly T[], index: number, cover: number | null): T[] {
  if (index === cover) return [...cards];
  return cards.map((card, i) => (i === index ? withRole(card, card.role === 'sample' ? undefined : 'sample') : card));
}

/** Vuelve portada una carta (deja de ser muestra); null quita la portada de las cartas, por una subida aparte. */
export function setCoverCard<T extends ShowcaseCard>(cards: readonly T[], index: number | null): T[] {
  return cards.map((card, i) => {
    if (i === index) return withRole(card, 'cover');
    return card.role === 'cover' ? withRole(card, undefined) : card;
  });
}
