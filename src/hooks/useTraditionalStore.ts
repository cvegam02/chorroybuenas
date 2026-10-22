import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { TraditionalGameRepository } from '../repositories/TraditionalGameRepository';
import { logger } from '../utils/logger';
import {
  emptyTraditionalState,
  hasPlacedCards,
  parseTraditionalState,
  startingTraditionalState,
  type TraditionalState,
} from '../utils/traditionalBoards';
import { createLatestSaver } from '../utils/traditionalGames';

/** Sin sesión, los tableros tradicionales viven en este navegador (FEAT-53, decisión 4). */
const STORAGE_KEY = 'loteria_traditional_boards';
export const TRADITIONAL_PATH = '/arma-tus-tableros';

export type TraditionalStatus = 'loading' | 'ready' | 'notFound' | 'error';

/** Lo guardado en el navegador; si no hay tableros, el tablero vacío con el que empieza la página. */
function readStored(): TraditionalState {
  try {
    const stored = parseTraditionalState(localStorage.getItem(STORAGE_KEY));
    return stored.boards.length > 0 ? stored : startingTraditionalState(stored.gridSize);
  } catch (error) {
    logger.warn('[useTraditionalStore] No se pudieron leer los tableros del navegador:', error);
    return startingTraditionalState(emptyTraditionalState().gridSize);
  }
}

function writeStored(state: TraditionalState | null): void {
  try {
    if (state) localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    else localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    logger.warn('[useTraditionalStore] No se pudieron guardar los tableros en el navegador:', error);
  }
}

/**
 * Dónde viven los tableros de «Arma tus tableros». Sin sesión, en el navegador. Con sesión, en un juego de la
 * cuenta (US A5): `gameId` es el juego abierto; sin él se empieza uno nuevo, que se crea al poner la primera
 * carta, y cada cambio se guarda solo (decisiones 16 y 17). Si al entrar con sesión hay tableros del
 * navegador, se ofrece pasarlos a la cuenta (decisión 18).
 */
export function useTraditionalStore(gameId: string | undefined) {
  const { t, i18n } = useTranslation();
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState<TraditionalState>(emptyTraditionalState);
  const [status, setStatus] = useState<TraditionalStatus>('loading');
  const [game, setGame] = useState<{ id: string; name: string } | null>(null);
  const [pendingTransfer, setPendingTransfer] = useState<TraditionalState | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const gameRef = useRef(game);
  gameRef.current = game;
  // Lo último que se sabe guardado en la cuenta: si el estado es igual, no hay nada que guardar.
  const lastSaved = useRef('');
  const creating = useRef(false);

  const saver = useMemo(
    () =>
      createLatestSaver<{ id: string; state: TraditionalState }>(
        async ({ id, state: next }) => {
          await TraditionalGameRepository.update(id, { gridSize: next.gridSize, boards: next.boards });
          setSaveFailed(false);
        },
        (error) => {
          logger.error('[useTraditionalStore] No se pudo guardar el juego:', error);
          setSaveFailed(true);
        },
      ),
    [],
  );

  const defaultName = useCallback(() => {
    const locale = i18n.language?.startsWith('en') ? 'en-US' : 'es-MX';
    const date = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(new Date());
    return t('traditional.game.defaultName', { date });
  }, [i18n.language, t]);

  // Cargar: del navegador sin sesión; de la cuenta, el juego abierto, o uno nuevo vacío.
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      if (gameId) navigate(TRADITIONAL_PATH, { replace: true });
      setGame(null);
      setState(readStored());
      setStatus('ready');
      return;
    }
    // Recién creado en esta misma pantalla: ya está cargado.
    if (gameId && gameRef.current?.id === gameId) return;
    if (!gameId) {
      const fresh = startingTraditionalState(emptyTraditionalState().gridSize);
      lastSaved.current = JSON.stringify(fresh);
      setGame(null);
      setState(fresh);
      const stored = readStored();
      setPendingTransfer(hasPlacedCards(stored.boards) ? stored : null);
      setStatus('ready');
      return;
    }

    let cancelled = false;
    setStatus('loading');
    TraditionalGameRepository.get(gameId)
      .then((found) => {
        if (cancelled) return;
        if (!found) {
          setStatus('notFound');
          return;
        }
        const loaded = { gridSize: found.gridSize, boards: found.boards };
        lastSaved.current = JSON.stringify(loaded);
        setGame({ id: found.id, name: found.name });
        setState(loaded);
        setStatus('ready');
      })
      .catch((error) => {
        if (cancelled) return;
        logger.error('[useTraditionalStore] No se pudo abrir el juego:', error);
        setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [authLoading, user, gameId, navigate]);

  // Guardar cada cambio.
  useEffect(() => {
    if (status !== 'ready' || authLoading) return;
    if (!user) {
      writeStored(state);
      return;
    }
    const json = JSON.stringify(state);
    if (json === lastSaved.current) return;
    if (game) {
      lastSaved.current = json;
      void saver.save({ id: game.id, state });
      return;
    }
    if (!hasPlacedCards(state.boards) || creating.current) return;

    creating.current = true;
    TraditionalGameRepository.create({ name: defaultName(), gridSize: state.gridSize, boards: state.boards })
      .then((created) => {
        lastSaved.current = JSON.stringify({ gridSize: created.gridSize, boards: created.boards });
        setSaveFailed(false);
        setGame({ id: created.id, name: created.name });
        navigate(`${TRADITIONAL_PATH}/${created.id}`, { replace: true });
      })
      .catch((error) => {
        logger.error('[useTraditionalStore] No se pudo crear el juego:', error);
        setSaveFailed(true);
      })
      .finally(() => {
        creating.current = false;
      });
  }, [state, status, authLoading, user, game, saver, defaultName, navigate]);

  const renameGame = useCallback(async (name: string) => {
    const current = gameRef.current;
    if (!current) return;
    await TraditionalGameRepository.update(current.id, { name });
    setGame({ id: current.id, name: name.trim() });
  }, []);

  /** «Guardar» del aviso: un juego nuevo con lo que había en el navegador, que se borra de ahí. */
  const acceptTransfer = useCallback(async () => {
    if (!pendingTransfer) return;
    const created = await TraditionalGameRepository.create({
      name: defaultName(),
      gridSize: pendingTransfer.gridSize,
      boards: pendingTransfer.boards,
    });
    writeStored(null);
    setPendingTransfer(null);
    navigate(`${TRADITIONAL_PATH}/${created.id}`);
  }, [pendingTransfer, defaultName, navigate]);

  const discardTransfer = useCallback(() => {
    writeStored(null);
    setPendingTransfer(null);
  }, []);

  return {
    state,
    setState: setState as Dispatch<SetStateAction<TraditionalState>>,
    status,
    isLoggedIn: user !== null,
    game,
    renameGame,
    saveFailed,
    pendingTransfer,
    acceptTransfer,
    discardTransfer,
  };
}
