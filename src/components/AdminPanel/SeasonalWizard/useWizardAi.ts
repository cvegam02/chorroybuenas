import { useCallback, useEffect, useState } from 'react';
import { AiCardsRepository, EMPTY_AI_BUILD, type AiBuild, type AiCard } from '../../../repositories/AiCardsRepository';
import type { AiCardText, AiInputSource, AiQuality } from '../../../utils/aiCardList';

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
  /** Escenas por número de carta, pegadas sobre la lista ya cargada (decisión 11). */
  loadScenes: (scenes: ReadonlyMap<number, string>) => Promise<boolean>;
  setScene: (cardId: string, scene: string) => void;
  saveCard: (cardId: string, patch?: { inputSource?: AiInputSource }) => void;
  generate: (cardId: string) => Promise<void>;
}

const withCard = (build: AiBuild, cardId: string, change: (card: AiCard) => AiCard): AiBuild => ({
  ...build,
  cards: build.cards.map((card) => (card.id === cardId ? change(card) : card)),
});

const without = <K, V>(map: ReadonlyMap<K, V>, key: K) => new Map([...map].filter(([k]) => k !== key));

/** Estado del modo «Generar con IA» del paso 2 (FEAT-50, US A2). Todo se guarda en la base al momento. */
export function useWizardAi(loteriaId: string | null): WizardAiState {
  const [status, setStatus] = useState<Status>('idle');
  const [build, setBuild] = useState<AiBuild>(EMPTY_AI_BUILD);
  const [urls, setUrls] = useState<ReadonlyMap<string, string>>(new Map());
  const [generating, setGenerating] = useState<ReadonlySet<string>>(new Set());
  const [cardErrors, setCardErrors] = useState<ReadonlyMap<string, string>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

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
    const chosen = loaded.cards.flatMap((card) => card.attempts.filter((a) => a.id === card.chosenAttemptId).map((a) => a.path));
    await addUrls(chosen);
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

  const loadScenes = async (scenes: ReadonlyMap<number, string>) => {
    const updates = build.cards.flatMap((card) => {
      const scene = scenes.get(card.number);
      return scene === undefined ? [] : [{ cardId: card.id, scene }];
    });
    setIsSaving(true);
    const ok = await AiCardsRepository.updateScenes(updates);
    setIsSaving(false);
    setBuild((prev) => ({ ...prev, cards: prev.cards.map((card) => ({ ...card, scene: scenes.get(card.number) ?? card.scene })) }));
    setError(ok ? null : 'No se pudieron guardar todas las escenas. Intenta de nuevo.');
    return ok;
  };

  const saveCard = (cardId: string, patch: { inputSource?: AiInputSource } = {}) => {
    const card = build.cards.find((item) => item.id === cardId);
    if (!card) return;
    if (patch.inputSource) setBuild((prev) => withCard(prev, cardId, (c) => ({ ...c, inputSource: patch.inputSource as AiInputSource })));
    void AiCardsRepository.updateCard(cardId, { scene: card.scene, ...patch }).then((ok) => {
      setError(ok ? null : `No se pudo guardar la carta ${card.number}. Intenta de nuevo.`);
    });
  };

  const generate = async (cardId: string) => {
    if (build.generalPrompt.trim() === '') {
      setCardErrors((prev) => new Map(prev).set(cardId, 'Escribe el prompt general antes de generar.'));
      return;
    }
    const card = build.cards.find((item) => item.id === cardId);
    // Lo escrito se guarda antes: el servidor genera con lo que hay en la base.
    if (!card || !(await saveSettings()) || !(await AiCardsRepository.updateCard(cardId, { scene: card.scene }))) return;
    setGenerating((prev) => new Set(prev).add(cardId));
    setCardErrors((prev) => without(prev, cardId));
    const result = await AiCardsRepository.generate(cardId);
    setGenerating((prev) => new Set([...prev].filter((id) => id !== cardId)));
    if (!result.ok) {
      setCardErrors((prev) => new Map(prev).set(cardId, result.message));
      return;
    }
    const { attempt } = result;
    setBuild((prev) => withCard(prev, cardId, (c) => ({ ...c, chosenAttemptId: attempt.id, attempts: [...c.attempts, attempt] })));
    await addUrls([attempt.path]);
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
    setScene: (cardId, scene) => setBuild((prev) => withCard(prev, cardId, (c) => ({ ...c, scene }))),
    saveCard,
    generate,
  };
}
