import { useCallback, useEffect, useRef, useState } from 'react';
import { useTokenBalance } from '../../contexts/TokenContext';
import { CallerVoiceService, type CallerVoiceState } from '../../services/CallerVoiceService';
import { audioUrlFor, INTRO_AUDIO_ID, pendingAudioIds, shouldRefund } from '../../utils/callerAiVoice';
import { logger } from '../../utils/logger';
import type { Card } from '../../types';

/**
 * «loading»: revisando si la lotería tiene voz con IA. «none»: no la tiene (se ofrece «Mejorar la voz»).
 * «generating»: generando los audios que faltan; no se puede empezar (decisión 26). «ready»: lista.
 * «unavailable»: no se pudo revisar; se canta con la voz del navegador y no se ofrece comprar.
 */
export type AiVoiceStatus = 'loading' | 'none' | 'generating' | 'ready' | 'unavailable';

/** La voz con IA del cantador (FEAT-55, US A6). `cards`: null mientras la lotería no está lista para cantar. */
export const useAiVoice = (setId: string | undefined, cards: Card[] | null) => {
  const { refreshBalance } = useTokenBalance();
  const [status, setStatus] = useState<AiVoiceStatus>('loading');
  const [voice, setVoice] = useState<CallerVoiceState | null>(null);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  // Se devolvieron los tokens porque no salió ninguna carta (decisiones 11 y 25)
  const [refunded, setRefunded] = useState(false);
  const alive = useRef(true);
  const cardsRef = useRef(cards);
  cardsRef.current = cards;
  const ready = cards !== null;

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  /** Genera, uno por uno, los audios que falten; luego vuelve a cargar la voz con sus enlaces. */
  const generateMissing = useCallback(
    async (id: string, current: CallerVoiceState) => {
      const deck = cardsRef.current ?? [];
      const pending = pendingAudioIds(deck, current.audioTitles, current.hasIntro);
      if (pending.length > 0) {
        setStatus('generating');
        setProgress({ done: 0, total: pending.length });
        for (const [index, audioId] of pending.entries()) {
          if (!alive.current) return;
          try {
            await CallerVoiceService.generate(id, audioId);
          } catch (err) {
            // La carta que falla se dice con la voz del navegador (decisión 26); se reintenta al volver a abrir
            logger.warn(`Caller voice: could not generate ${audioId}:`, err);
          }
          if (alive.current) setProgress({ done: index + 1, total: pending.length });
        }
      }
      const loaded = await CallerVoiceService.load(id);
      if (!alive.current) return;
      const cardAudios = loaded ? loaded.audioTitles.size : 0;
      if (loaded && deck.length > 0 && shouldRefund(cardAudios)) {
        await CallerVoiceService.refund(id);
        await refreshBalance();
        if (!alive.current) return;
        setVoice(null);
        setRefunded(true);
        setStatus('none');
        return;
      }
      setVoice(loaded);
      setStatus(loaded ? 'ready' : 'none');
    },
    [refreshBalance],
  );

  // Al abrir: revisar si la lotería tiene voz y generar lo que falte (decisión 15)
  useEffect(() => {
    if (!setId || !ready) return;
    let cancelled = false;
    CallerVoiceService.load(setId)
      .then((loaded) => {
        if (cancelled || !alive.current) return;
        if (!loaded) {
          setStatus('none');
          return;
        }
        return generateMissing(setId, loaded);
      })
      .catch((err) => {
        logger.error('Caller voice: could not load the AI voice:', err);
        if (!cancelled && alive.current) setStatus('unavailable');
      });
    return () => {
      cancelled = true;
    };
  }, [setId, ready, generateMissing]);

  /** Paga la voz escogida y genera todos los audios. Rechaza con el código del servidor. */
  const buy = useCallback(
    async (voiceId: string) => {
      if (!setId) return;
      await CallerVoiceService.start(setId, voiceId);
      // «Mejorar la voz» desaparece en cuanto se cobra (decisión 13)
      setStatus('generating');
      setProgress({ done: 0, total: 0 });
      setRefunded(false);
      await refreshBalance();
      const empty: CallerVoiceState = { voiceId, hasIntro: false, audioTitles: new Map(), urls: new Map() };
      generateMissing(setId, empty).catch((err) => {
        logger.error('Caller voice: generation failed:', err);
        if (alive.current) setStatus('unavailable');
      });
    },
    [setId, refreshBalance, generateMissing],
  );

  const urlFor = useCallback(
    (card: Card): string | undefined => (voice ? audioUrlFor(voice.urls, voice.audioTitles, card) : undefined),
    [voice],
  );
  const introUrl = voice?.urls.get(INTRO_AUDIO_ID);

  return { status, progress, refunded, buy, urlFor, introUrl };
};
