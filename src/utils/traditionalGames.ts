/**
 * Juegos de lotería tradicional guardados en la cuenta (FEAT-53, US A5): leer una fila de
 * `traditional_games` y guardar los cambios en orden, sin perder el último.
 */
import type { GridSize } from '../types';
import { parseTraditionalState, type TraditionalBoard } from './traditionalBoards';

export interface TraditionalGame {
  id: string;
  name: string;
  gridSize: GridSize;
  boards: TraditionalBoard[];
  updatedAt: string;
}

/** Una fila de la base, validada como lo guardado en el navegador: los tableros dañados se descartan. */
export function traditionalGameFromRow(row: unknown): TraditionalGame | null {
  if (typeof row !== 'object' || row === null) return null;
  const { id, name, grid_size: gridSize, boards, updated_at: updatedAt } = row as Record<string, unknown>;
  if (typeof id !== 'string' || typeof name !== 'string' || (gridSize !== 9 && gridSize !== 16)) return null;

  const state = parseTraditionalState(JSON.stringify({ gridSize, boards }));
  return { id, name, gridSize, boards: state.boards, updatedAt: typeof updatedAt === 'string' ? updatedAt : '' };
}

export interface LatestSaver<T> {
  save: (value: T) => Promise<void>;
}

/**
 * Guarda uno a la vez. Lo que llega mientras se guarda espera, y de eso solo se guarda lo último: los pasos
 * intermedios ya no importan. Si un guardado falla se llama `onError` y el siguiente cambio lo vuelve a intentar.
 */
export function createLatestSaver<T>(write: (value: T) => Promise<void>, onError?: (error: unknown) => void): LatestSaver<T> {
  let running: Promise<void> | null = null;
  let queued: { value: T } | null = null;

  const run = async (value: T): Promise<void> => {
    try {
      await write(value);
    } catch (error) {
      onError?.(error);
    }
    const next = queued;
    queued = null;
    if (next) await run(next.value);
  };

  return {
    save(value) {
      if (running) {
        queued = { value };
        return running;
      }
      running = run(value).finally(() => {
        running = null;
      });
      return running;
    },
  };
}
