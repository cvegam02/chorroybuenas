import { useCallback, useEffect, useRef, useState } from 'react';
import { AiCardsRepository, EMPTY_AI_BUILD, type AiBuild, type AiCard } from '../../../repositories/AiCardsRepository';
import { AI_BATCH_CONCURRENCY, cardsToGenerate, retryWhenBusy, runWithLimit } from '../../../utils/aiCardBatch';
import type { AiCardText, AiInputSource, AiQuality, SceneUpdate } from '../../../utils/aiCardList';

type Status = 'idle' | 'loading' | 'failed' | 'ready';

export interface WizardAiState {
  status: Status;
  build: AiBuild;
  /** Dirección temporal de cada intento, por ruta. */
  urls: ReadonlyMap<string, string>;
  generating: ReadonlySet<string>;
  /** Error de la última generación de cada carta. */
  cardErrors: ReadonlyMap<string, string>;
  error: string | null;
  isSaving: boolean;
  reload: () => void;
  setGeneralPrompt: (text: string) => void;
  saveSettings: () => Promise<boolean>;
  setQuality: (quality: AiQuality) => void;
  loadList: (texts: readonly AiCardText[], source: AiInputSource) => Promise<boolean>;
  /** Escenas (y nombres nuevos) por número de carta, pegadas sobre la lista ya cargada (decisiones 11 y 12). */
  loadScenes: (scenes: ReadonlyMap<number, SceneUpdate>) => Promise<boolean>;
  setName: (cardId: string, name: string) => void;
  setScene: (cardId: string, scene: string) => void;
  saveCard: (cardId: string, patch?: { inputSource?: AiInputSource }) => void;
  generate: (cardId: string) => Promise<void>;
  /** «Generar las que faltan» (US A4): las cartas sin intento elegido, pocas a la vez. */
  generateMissing: () => Promise<void>;
  isBatchRunning: boolean;
  /** Cambia el intento que se queda (US A3). */
  chooseAttempt: (cardId: string, attemptId: string) => void;
  /** Marca la carta cuyo intento elegido sirve de referencia de estilo, o ninguna (US A3). */
  setReference: (cardId: string | null) => void;
}

const withCard = (build: AiBuild, cardId: string, change: (card: AiCard) => AiCard): AiBuild => ({
  ...build,
  cards: build.cards.map((card) => (card.id === cardId ? change(card) : card)),
});

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const without = <K, V>(map: ReadonlyMap<K, V>, key: K) => new Map([...map].filter(([k]) => k !== key));

/** Estado del modo «Generar con IA» del paso 2 (FEAT-50, US A2 y A3). Todo se guarda en la base al momento. */
export function useWizardAi(loteriaId: string | null): WizardAiState {
  const [status, setStatus] = useState<Status>('idle');
  const [build, setBuild] = useState<AiBuild>(EMPTY_AI_BUILD);
  const [urls, setUrls] = useState<ReadonlyMap<string, string>>(new Map());
  const [generating, setGenerating] = useState<ReadonlySet<string>>(new Set());
  const [cardErrors, setCardErrors] = useState<ReadonlyMap<string, string>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isBatchRunning, setIsBatchRunning] = useState(false);
  // Al salir del asistente la cola deja de empezar cartas nuevas; las que ya corren terminan en el servidor.
  const left = useRef(false);
  useEffect(() => {
    left.current = false;
    return () => {
      left.current = true;
    };
  }, []);

  const addUrls = useCallback(async (paths: string[]) => {
    const found = await AiCardsRepository.getAttemptUrls(paths);
    if (found) setUrls((prev) => new Map([...prev, ...found]));
  }, []);

  const reload = useCallback(async () => {
    if (!loteriaId) return;
    setStatus('loading');
    const loaded = await AiCardsRepository.getBuild(loteriaId);
    if (!loaded) {
      setStatus('failed');
      return;
    }
    setBuild(loaded);
    setStatus('ready');
    await addUrls(loaded.cards.flatMap((card) => card.attempts.map((attempt) => attempt.path)));
  }, [loteriaId, addUrls]);

  useEffect(() => {
    reload();
  }, [reload]);

  const saveSettings = useCallback(async () => {
    if (!loteriaId) return false;
    const ok = await AiCardsRepository.saveSettings(loteriaId, { generalPrompt: build.generalPrompt, quality: build.quality });
    setError(ok ? null : 'No se pudo guardar el prompt general. Intenta de nuevo.');
    return ok;
  }, [loteriaId, build.generalPrompt, build.quality]);

  const setQuality = (quality: AiQuality) => {
    setBuild((prev) => ({ ...prev, quality }));
    if (loteriaId) void AiCardsRepository.saveSettings(loteriaId, { generalPrompt: build.generalPrompt, quality });
  };

  const loadList = async (texts: readonly AiCardText[], source: AiInputSource) => {
    if (!loteriaId) return false;
    setIsSaving(true);
    const cards = await AiCardsRepository.replaceCards(loteriaId, build, texts, source);
    setIsSaving(false);
    if (!cards) {
      setError('No se pudo guardar la lista de cartas. Intenta de nuevo.');
      return false;
    }
    setError(null);
    setCardErrors(new Map());
    setBuild((prev) => ({ ...prev, referenceCardId: null, cards }));
    return true;
  };

  const loadScenes = async (scenes: ReadonlyMap<number, SceneUpdate>) => {
    const updates = build.cards.flatMap((card) => {
      const update = scenes.get(card.number);
      return update === undefined ? [] : [{ cardId: card.id, ...update }];
    });
    setIsSaving(true);
    const ok = await AiCardsRepository.updateScenes(updates);
    setIsSaving(false);
    setBuild((prev) => ({ ...prev, cards: prev.cards.map((card) => ({ ...card, ...scenes.get(card.number) })) }));
    setError(ok ? null : 'No se pudieron guardar todas las escenas. Intenta de nuevo.');
    return ok;
  };

  const saveCard = (cardId: string, patch: { inputSource?: AiInputSource } = {}) => {
    const card = build.cards.find((item) => item.id === cardId);
    if (!card) return;
    const name = card.name.trim();
    if (name === '') {
      setError(`La carta ${card.number} necesita nombre.`);
      return;
    }
    if (patch.inputSource) setBuild((prev) => withCard(prev, cardId, (c) => ({ ...c, inputSource: patch.inputSource as AiInputSource })));
    void AiCardsRepository.updateCard(cardId, { name, scene: card.scene, ...patch }).then((ok) => {
      setError(ok ? null : `No se pudo guardar la carta ${card.number}. Intenta de nuevo.`);
    });
  };

  const setCardError = (cardId: string, message: string) => setCardErrors((prev) => new Map(prev).set(cardId, message));

  /** Genera una carta; el prompt general ya se guardó. */
  const generateOne = async (card: AiCard) => {
    const cardId = card.id;
    if (card.name.trim() === '') {
      setCardError(cardId, 'Escribe el nombre de la carta antes de generar.');
      return;
    }
    // Lo escrito se guarda antes: el servidor genera con lo que hay en la base.
    if (!(await AiCardsRepository.updateCard(cardId, { name: card.name.trim(), scene: card.scene }))) {
      setCardError(cardId, 'No se pudo guardar la carta. Intenta de nuevo.');
      return;
    }
    setGenerating((prev) => new Set(prev).add(cardId));
    setCardErrors((prev) => without(prev, cardId));
    const result = await retryWhenBusy(() => AiCardsRepository.generate(cardId), wait);
    setGenerating((prev) => new Set([...prev].filter((id) => id !== cardId)));
    if (!result.ok) {
      setCardError(cardId, result.message);
      return;
    }
    const { attempt, prunedIds } = result;
    setBuild((prev) =>
      withCard(prev, cardId, (c) => ({
        ...c,
        chosenAttemptId: attempt.id,
        attempts: [...c.attempts.filter((a) => !prunedIds.includes(a.id)), attempt],
      })),
    );
    await addUrls([attempt.path]);
  };

  const generate = async (cardId: string) => {
    const card = build.cards.find((item) => item.id === cardId);
    if (!card) return;
    if (build.generalPrompt.trim() === '') return setCardError(cardId, 'Escribe el prompt general antes de generar.');
    if (await saveSettings()) await generateOne(card);
  };

  const generateMissing = async () => {
    const missing = cardsToGenerate(build.cards, generating);
    if (missing.length === 0) return;
    if (build.generalPrompt.trim() === '') return setError('Escribe el prompt general antes de generar.');
    if (!(await saveSettings())) return;
    setIsBatchRunning(true);
    await runWithLimit(missing, AI_BATCH_CONCURRENCY, generateOne, () => left.current);
    setIsBatchRunning(false);
  };

  const chooseAttempt = (cardId: string, attemptId: string) => {
    const card = build.cards.find((item) => item.id === cardId);
    if (!card || card.chosenAttemptId === attemptId) return;
    const previous = card.chosenAttemptId;
    setBuild((prev) => withCard(prev, cardId, (c) => ({ ...c, chosenAttemptId: attemptId })));
    void AiCardsRepository.updateCard(cardId, { chosenAttemptId: attemptId }).then((ok) => {
      if (ok) return setError(null);
      setBuild((prev) => withCard(prev, cardId, (c) => ({ ...c, chosenAttemptId: previous })));
      setError(`No se pudo cambiar el intento de la carta ${card.number}. Intenta de nuevo.`);
    });
  };

  const setReference = (cardId: string | null) => {
    if (!loteriaId) return;
    const previous = build.referenceCardId;
    setBuild((prev) => ({ ...prev, referenceCardId: cardId }));
    void AiCardsRepository.saveSettings(loteriaId, {
      generalPrompt: build.generalPrompt,
      quality: build.quality,
      referenceCardId: cardId,
    }).then((ok) => {
      if (ok) return setError(null);
      setBuild((prev) => ({ ...prev, referenceCardId: previous }));
      setError('No se pudo cambiar la carta de referencia. Intenta de nuevo.');
    });
  };

  return {
    status: loteriaId ? status : 'idle',
    build,
    urls,
    generating,
    cardErrors,
    error,
    isSaving,
    reload: () => void reload(),
    setGeneralPrompt: (text) => setBuild((prev) => ({ ...prev, generalPrompt: text })),
    saveSettings,
    setQuality,
    loadList,
    loadScenes,
    setName: (cardId, name) => setBuild((prev) => withCard(prev, cardId, (c) => ({ ...c, name }))),
    setScene: (cardId, scene) => setBuild((prev) => withCard(prev, cardId, (c) => ({ ...c, scene }))),
    saveCard,
    generate,
    generateMissing,
    isBatchRunning,
    chooseAttempt,
    setReference,
  };
}
