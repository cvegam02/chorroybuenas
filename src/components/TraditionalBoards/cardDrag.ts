/**
 * Lo que se arrastra en «Arma tus tableros» (FEAT-53, US A2): una carta de la baraja o una casilla de un
 * tablero. Viaja como JSON con un tipo propio, para no aceptar textos ni archivos soltados desde fuera.
 */
import type { DragEvent } from 'react';
import { TRADITIONAL_CARD_COUNT } from '../../utils/traditionalBoards';

const CARD_DRAG_TYPE = 'application/x-loteria-tradicional';

export type CardDrag = { source: 'deck'; card: number } | { source: 'cell'; boardId: string; cell: number };

export function startCardDrag(event: DragEvent, data: CardDrag): void {
  event.dataTransfer.setData(CARD_DRAG_TYPE, JSON.stringify(data));
  event.dataTransfer.effectAllowed = 'move';
}

/** Durante el arrastre el contenido no se puede leer; solo se sabe si es de los nuestros. */
export const isCardDrag = (event: DragEvent): boolean => event.dataTransfer.types.includes(CARD_DRAG_TYPE);

export function readCardDrag(event: DragEvent): CardDrag | null {
  try {
    const data: unknown = JSON.parse(event.dataTransfer.getData(CARD_DRAG_TYPE));
    if (typeof data !== 'object' || data === null) return null;
    const value = data as Record<string, unknown>;
    if (value.source === 'deck' && Number.isInteger(value.card)) {
      const card = value.card as number;
      return card >= 1 && card <= TRADITIONAL_CARD_COUNT ? { source: 'deck', card } : null;
    }
    if (value.source === 'cell' && typeof value.boardId === 'string' && Number.isInteger(value.cell)) {
      return { source: 'cell', boardId: value.boardId, cell: value.cell as number };
    }
    return null;
  } catch {
    return null;
  }
}
