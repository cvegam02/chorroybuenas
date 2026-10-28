import { useCallback, useEffect, useState } from 'react';
import {
  type AutoRhythm,
  type CustomRhythm,
  clampCustomRhythm,
  delayAfterCard,
  isManual,
  parseCustomRhythm,
  parseRhythm,
} from '../../utils/callerAuto';
import { type CallerGame, isFinished } from '../../utils/callerGame';
import { logger } from '../../utils/logger';

const RHYTHM_KEY = 'cantador:ritmo';
const CUSTOM_RHYTHM_KEY = 'cantador:ritmo-personalizado';

const readRhythm = (): AutoRhythm => {
  try {
    return parseRhythm(localStorage.getItem(RHYTHM_KEY));
  } catch {
    return parseRhythm(null);
  }
};

const readCustomRhythm = (): CustomRhythm => {
  try {
    return parseCustomRhythm(localStorage.getItem(CUSTOM_RHYTHM_KEY));
  } catch {
    return parseCustomRhythm(null);
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
  const [custom, setCustom] = useState<CustomRhythm>(readCustomRhythm);
  const [running, setRunning] = useState(false);
  // La carta (por su número de salida) que la voz ya terminó de decir
  const [spokenFor, setSpokenFor] = useState<number | null>(null);
  // Diciendo la carta que se acaba de sacar: en manual no se saca otra hasta que termine (FEAT-59, decisión 4)
  const [speaking, setSpeaking] = useState(false);
  const drawn = game?.drawn ?? 0;
  const done = game ? isFinished(game) : true;

  const next = useCallback(() => {
    if (done) return;
    const number = drawn + 1;
    setSpeaking(true);
    drawAndSay(() => {
      setSpokenFor(number);
      setSpeaking(false);
    });
  }, [done, drawn, drawAndSay]);

  useEffect(() => {
    if (!running) return;
    // En manual nada corre solo (FEAT-59, US A2)
    if (done || isManual(rhythm)) {
      setRunning(false);
      return;
    }
    if (spokenFor !== drawn) return;
    const timer = window.setTimeout(next, delayAfterCard(rhythm, drawn, custom));
    return () => window.clearTimeout(timer);
  }, [running, done, spokenFor, drawn, rhythm, custom, next]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') setRunning(false);
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  const start = useCallback(() => {
    if (done || isManual(rhythm)) return;
    setRunning(true);
    next();
  }, [done, rhythm, next]);

  const stop = useCallback(() => setRunning(false), []);

  const changeRhythm = useCallback((value: AutoRhythm) => {
    setRhythm(value);
    try {
      localStorage.setItem(RHYTHM_KEY, value);
    } catch (err) {
      logger.warn('Could not save the caller rhythm:', err);
    }
  }, []);

  /** Los tiempos del personalizado (FEAT-59, US A3), dentro de sus límites; se recuerdan como el ritmo. */
  const changeCustom = useCallback((value: CustomRhythm) => {
    const clamped = clampCustomRhythm(value);
    setCustom(clamped);
    try {
      localStorage.setItem(CUSTOM_RHYTHM_KEY, JSON.stringify(clamped));
    } catch (err) {
      logger.warn('Could not save the custom caller rhythm:', err);
    }
  }, []);

  return { rhythm, changeRhythm, custom, changeCustom, running, speaking, start, stop, next };
};
