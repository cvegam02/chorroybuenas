import type { GridSize } from '../../types';
import { minCardsForGrid } from '../../utils/gridRules';

export type SetViewState =
  | { kind: 'ready' }
  | { kind: 'missingBoards' }
  | { kind: 'missingCards'; missing: number; min: number };

interface SetViewStateInput {
  cardCount: number;
  boardCount: number;
  gridSize: GridSize;
}

/**
 * En qué va la lotería que se está viendo: de aquí salen su aviso y los botones del encabezado.
 * Con tableros guardados ya se puede imprimir, aunque después se le hayan quitado cartas: el PDF se arma
 * con los tableros. Sin tableros, depende de si las cartas alcanzan el mínimo de su modo.
 */
export const setViewStateOf = ({ cardCount, boardCount, gridSize }: SetViewStateInput): SetViewState => {
  if (boardCount > 0) return { kind: 'ready' };
  const min = minCardsForGrid(gridSize);
  if (cardCount >= min) return { kind: 'missingBoards' };
  return { kind: 'missingCards', missing: min - cardCount, min };
};
