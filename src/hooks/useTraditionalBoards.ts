import { useCallback } from 'react';
import type { GridSize } from '../types';
import {
  addEmptyBoard,
  addRandomBoards,
  fillBoardEmptyCells,
  fillEmptyCells,
  placeCard,
  removeBoard,
  reshuffleAll,
  reshuffleBoard,
  startingTraditionalState,
  swapCells,
  toggleFixed,
} from '../utils/traditionalBoards';
import { useTraditionalStore } from './useTraditionalStore';

/**
 * Los tableros de «Arma tus tableros» y lo que se puede hacer con ellos. Dónde se guardan (navegador o
 * cuenta) lo resuelve `useTraditionalStore`.
 */
export function useTraditionalBoards(gameId: string | undefined) {
  const { state, setState, ...store } = useTraditionalStore(gameId);

  const addBoards = useCallback((count: number) => {
    setState((prev) => ({ ...prev, boards: addRandomBoards(prev.boards, count, prev.gridSize) }));
  }, [setState]);

  const shuffleBoard = useCallback((id: string) => {
    setState((prev) => ({ ...prev, boards: reshuffleBoard(prev.boards, id, prev.gridSize) }));
  }, [setState]);

  const shuffleAll = useCallback(() => {
    setState((prev) => ({ ...prev, boards: reshuffleAll(prev.boards, prev.gridSize) }));
  }, [setState]);

  const deleteBoard = useCallback((id: string) => {
    setState((prev) => ({ ...prev, boards: removeBoard(prev.boards, id) }));
  }, [setState]);

  const putCard = useCallback((id: string, cell: number, card: number) => {
    setState((prev) => ({ ...prev, boards: placeCard(prev.boards, id, cell, card) }));
  }, [setState]);

  const swap = useCallback((id: string, from: number, to: number) => {
    setState((prev) => ({ ...prev, boards: swapCells(prev.boards, id, from, to) }));
  }, [setState]);

  const addEmpty = useCallback(() => {
    setState((prev) => ({ ...prev, boards: addEmptyBoard(prev.boards, prev.gridSize) }));
  }, [setState]);

  const toggleFix = useCallback((id: string, cell: number) => {
    setState((prev) => ({ ...prev, boards: toggleFixed(prev.boards, id, cell) }));
  }, [setState]);

  const fillEmpty = useCallback(() => {
    setState((prev) => ({ ...prev, boards: fillEmptyCells(prev.boards, prev.gridSize) }));
  }, [setState]);

  const fillBoard = useCallback(
    (id: string) => {
      setState((prev) => ({ ...prev, boards: fillBoardEmptyCells(prev.boards, id, prev.gridSize) }));
    },
    [setState],
  );

  /** Cambiar de modo vuelve a empezar con un tablero vacío: los del otro tamaño no sirven. */
  const changeMode = useCallback(
    (gridSize: GridSize) => {
      setState(startingTraditionalState(gridSize));
    },
    [setState],
  );

  return {
    ...state,
    ...store,
    addBoards,
    shuffleBoard,
    shuffleAll,
    deleteBoard,
    changeMode,
    putCard,
    swap,
    addEmpty,
    toggleFix,
    fillEmpty,
    fillBoard,
  };
}
