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
 * La voz del cantador (FEAT-55): la del navegador en español, de preferencia de México (US A4), o el audio
 * con voz de IA de la carta cuando la lotería lo tiene (US A6).
 * `say` debe llamarse desde un toque la primera vez: Safari de iPhone no habla ni reproduce audio antes.
 * `voiceStatus`: «checking» mientras el navegador da su lista de voces; «none» si ninguna es en español.
 */
export const useCardVoice = () => {
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [voicesKnown, setVoicesKnown] = useState(() => synth() === null);
  const [muted, setMuted] = useState(readMuted);
  const mutedRef = useRef(muted);
  mutedRef.current = muted;
  // Un solo reproductor para los audios con IA: el primer toque lo deja sonar en Safari de iPhone
  const audioRef = useRef<HTMLAudioElement | null>(null);

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

  useEffect(() => () => audioRef.current?.pause(), []);

  /**
   * Dice el texto y llama a `onDone` al terminar; en silencio, o sin ninguna voz, al segundo.
   * Con `audioUrl` reproduce ese audio; si no suena, lo dice con la voz del navegador.
   */
  const say = useCallback(
    (text: string, onDone?: () => void, audioUrl?: string) => {
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
      speech?.cancel();
      audioRef.current?.pause();
      if (mutedRef.current) {
        window.setTimeout(done, MUTED_SPEECH_MS);
        return;
      }

      const speak = () => {
        if (!speech || !voice) {
          // Sin voz en español solo se canta con voz con IA (decisión 24): se espera como en silencio
          window.setTimeout(done, MUTED_SPEECH_MS);
          return;
        }
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
      };

      if (!audioUrl) {
        speak();
        return;
      }
      const audio = audioRef.current ?? new Audio();
      audioRef.current = audio;
      audio.onended = done;
      audio.onerror = () => {
        logger.warn('AI voice audio failed; using the browser voice');
        speak();
      };
      audio.src = audioUrl;
      audio.play().catch((err: unknown) => {
        // Pausarlo para sacar otra carta también rechaza la reproducción: no es un error
        if (err instanceof DOMException && err.name === 'AbortError') return;
        logger.warn('AI voice audio could not play; using the browser voice:', err);
        speak();
      });
    },
    [voice],
  );

  const toggleMuted = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      saveMuted(next);
      if (next) {
        synth()?.cancel();
        audioRef.current?.pause();
      }
      return next;
    });
  }, []);

  const voiceStatus: 'checking' | 'ready' | 'none' = !voicesKnown ? 'checking' : voice ? 'ready' : 'none';
  return { say, muted, toggleMuted, voiceStatus };
};
