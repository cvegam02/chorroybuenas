import { useCallback, useEffect, useState } from 'react';
import {
  type CallerGame,
  drawNext,
  newGame,
  parseSavedGame,
  reconcileGame,
} from '../utils/callerGame';
import { logger } from '../utils/logger';

const storageKey = (setId: string) => `cantador:${setId}`;

const readSaved = (setId: string): CallerGame | null => {
  try {
    return parseSavedGame(localStorage.getItem(storageKey(setId)));
  } catch (err) {
    logger.warn('Could not read the saved caller game:', err);
    return null;
  }
};

const save = (setId: string, game: CallerGame) => {
  try {
    localStorage.setItem(storageKey(setId), JSON.stringify(game));
  } catch (err) {
    // Sin almacenamiento la partida sigue; solo no se recuerda al recargar
    logger.warn('Could not save the caller game:', err);
  }
};

/**
 * La partida del cantador de una lotería (FEAT-55, US A2): se recuerda en el navegador, así que al recargar
 * sigue donde iba, y se ajusta a las cartas que tenga la lotería hoy. `cardIds` es null mientras cargan.
 */
export const useCallerGame = (setId: string | undefined, cardIds: string[] | null) => {
  const [state, setState] = useState<{ setId: string; game: CallerGame } | null>(null);
  const idsKey = cardIds?.join(',') ?? null;

  useEffect(() => {
    if (!setId || !cardIds) return;
    setState((prev) => {
      const base = prev?.setId === setId ? prev.game : readSaved(setId);
      return { setId, game: base ? reconcileGame(base, cardIds) : newGame(cardIds) };
    });
    // idsKey resume cardIds: solo se ajusta cuando cambian las cartas, no en cada render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setId, idsKey]);

  useEffect(() => {
    if (state) save(state.setId, state.game);
  }, [state]);

  const update = useCallback((change: (game: CallerGame) => CallerGame) => {
    setState((prev) => (prev ? { ...prev, game: change(prev.game) } : prev));
  }, []);

  const draw = useCallback(() => update(drawNext), [update]);
  const restart = useCallback(() => update((game) => newGame(game.order)), [update]);

  const game = state && state.setId === setId ? state.game : null;
  return { game, draw, restart };
};
