import { useCallback, useEffect, useState } from 'react';
import { type AutoRhythm, delayAfterCard, parseRhythm } from '../../utils/callerAuto';
import { type CallerGame, isFinished } from '../../utils/callerGame';
import { logger } from '../../utils/logger';

const RHYTHM_KEY = 'cantador:ritmo';

const readRhythm = (): AutoRhythm => {
  try {
    return parseRhythm(localStorage.getItem(RHYTHM_KEY));
  } catch {
    return parseRhythm(null);
  }
};

/**
 * Modo automático del cantador (FEAT-55, US A5): saca cartas solas al ritmo elegido, contando desde que la
 * voz termina. Se detiene al acabar la baraja y se pausa si se bloquea la pantalla o se cambia de app.
 * `drawAndSay` saca la siguiente y llama a su callback cuando terminó de decirla.
 * Todas las cartas, solas o a mano, se sacan con `next`, para que el ritmo cuente desde la última.
 */
export const useAutoCaller = (game: CallerGame | null, drawAndSay: (onSpoken: () => void) => void) => {
  const [rhythm, setRhythm] = useState<AutoRhythm>(readRhythm);
  const [running, setRunning] = useState(false);
  // La carta (por su número de salida) que la voz ya terminó de decir
  const [spokenFor, setSpokenFor] = useState<number | null>(null);
  const drawn = game?.drawn ?? 0;
  const done = game ? isFinished(game) : true;

  const next = useCallback(() => {
    const number = drawn + 1;
    drawAndSay(() => setSpokenFor(number));
  }, [drawn, drawAndSay]);

  useEffect(() => {
    if (!running) return;
    if (done) {
      setRunning(false);
      return;
    }
    if (spokenFor !== drawn) return;
    const timer = window.setTimeout(next, delayAfterCard(rhythm, drawn));
    return () => window.clearTimeout(timer);
  }, [running, done, spokenFor, drawn, rhythm, next]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') setRunning(false);
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  const start = useCallback(() => {
    if (done) return;
    setRunning(true);
    next();
  }, [done, next]);

  const stop = useCallback(() => setRunning(false), []);

  const changeRhythm = useCallback((value: AutoRhythm) => {
    setRhythm(value);
    try {
      localStorage.setItem(RHYTHM_KEY, value);
    } catch (err) {
      logger.warn('Could not save the caller rhythm:', err);
    }
  }, []);

  return { rhythm, changeRhythm, running, start, stop, next };
};
