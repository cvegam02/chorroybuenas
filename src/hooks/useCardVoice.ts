import { useCallback, useEffect, useRef, useState } from 'react';
import { pickSpanishVoice } from '../utils/callerVoice';
import { logger } from '../utils/logger';

const MUTED_KEY = 'cantador:silencio';
/** Lo más que se espera a que la voz diga un título. */
const SPEECH_TIMEOUT_MS = 8000;
/** En silencio, lo que se finge que tarda en decirse un título, para que el ritmo sea el mismo que con voz. */
const MUTED_SPEECH_MS = 1000;

const readMuted = (): boolean => {
  try {
    return localStorage.getItem(MUTED_KEY) === '1';
  } catch {
    return false;
  }
};

const saveMuted = (muted: boolean) => {
  try {
    localStorage.setItem(MUTED_KEY, muted ? '1' : '0');
  } catch (err) {
    logger.warn('Could not save the caller mute setting:', err);
  }
};

const synth = (): SpeechSynthesis | null => (typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null);

/**
 * La voz del navegador del cantador (FEAT-55, US A4): dice los títulos en español, de preferencia de México.
 * `say` debe llamarse desde un toque la primera vez: Safari de iPhone no habla antes.
 * `voiceStatus`: «checking» mientras el navegador da su lista de voces; «none» si ninguna es en español.
 */
export const useCardVoice = () => {
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [voicesKnown, setVoicesKnown] = useState(() => synth() === null);
  const [muted, setMuted] = useState(readMuted);
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  useEffect(() => {
    const speech = synth();
    if (!speech) return;
    // Chrome entrega la lista tarde, con el evento; Safari y Firefox, casi siempre de inmediato
    const load = () => {
      const voices = speech.getVoices();
      if (voices.length === 0) return;
      setVoice(pickSpanishVoice(voices));
      setVoicesKnown(true);
    };
    load();
    speech.addEventListener('voiceschanged', load);
    // Hay navegadores (Firefox en Linux sin voces) que nunca entregan la lista: se da por vacía
    const giveUp = window.setTimeout(() => setVoicesKnown(true), 3000);
    return () => {
      window.clearTimeout(giveUp);
      speech.removeEventListener('voiceschanged', load);
      speech.cancel();
    };
  }, []);

  /** Dice el texto y llama a `onDone` al terminar; en silencio, al segundo; si no hay voz, enseguida. */
  const say = useCallback(
    (text: string, onDone?: () => void) => {
      let finished = false;
      const done = () => {
        if (finished) return;
        finished = true;
        window.clearTimeout(fallback);
        onDone?.();
      };
      // Por si el navegador nunca avisa que terminó (pasa en algunos celulares)
      const fallback = window.setTimeout(done, SPEECH_TIMEOUT_MS);

      const speech = synth();
      if (!speech || !voice) {
        window.setTimeout(done, 0);
        return;
      }
      if (mutedRef.current) {
        window.setTimeout(done, MUTED_SPEECH_MS);
        return;
      }
      speech.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.voice = voice;
      utterance.lang = voice.lang;
      utterance.rate = 0.95;
      utterance.onend = done;
      utterance.onerror = (event) => {
        // «interrupted» y «canceled» son normales al sacar otra carta antes de que termine
        if (event.error !== 'interrupted' && event.error !== 'canceled') logger.warn('Speech error:', event.error);
        done();
      };
      speech.speak(utterance);
    },
    [voice],
  );

  const toggleMuted = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      saveMuted(next);
      if (next) synth()?.cancel();
      return next;
    });
  }, []);

  const voiceStatus: 'checking' | 'ready' | 'none' = !voicesKnown ? 'checking' : voice ? 'ready' : 'none';
  return { say, muted, toggleMuted, voiceStatus };
};
