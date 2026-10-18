import { useCallback, useEffect, useRef, useState } from 'react';
import { SeasonalRepository } from '../../../repositories/SeasonalRepository';
import { logger } from '../../../utils/logger';
import type { SeasonalBuild, StoredCard } from '../../../utils/seasonalBuild';
import { prepareSeasonalCard, validateCardFile } from '../../../utils/seasonalCards';

/** Una carta guardada, con la dirección para verla. */
export interface WizardCard extends StoredCard {
  /** La ruta: identifica la carta en los tableros y en las listas. */
  id: string;
  url: string;
}

export interface RejectedCardFile {
  fileName: string;
  reason: string;
}

type LoadStatus = 'idle' | 'loading' | 'ready' | 'failed';

interface CardsState {
  cards: WizardCard[];
  boards: number[][];
  pdfIsCurrent: boolean;
}

const byFileName = new Intl.Collator('es', { numeric: true, sensitivity: 'base' });

const toStored = ({ path, fileName, offRatio, role, previewPath }: WizardCard): StoredCard => ({
  path,
  fileName,
  offRatio,
  ...(role ? { role } : {}),
  ...(previewPath ? { previewPath } : {}),
});

/**
 * Las cartas de la lotería que se arma en el asistente (FEAT-48, decisión 18): se suben al espacio privado
 * en cuanto se preparan, y su orden y los tableros se guardan con cada cambio. Cambiar las cartas borra
 * los tableros, porque ya no corresponden. `onCountsChange` avisa los números nuevos para la ficha.
 */
export function useWizardCards(
  loteriaId: string | null,
  onCountsChange: (counts: { cardCount: number; boardCount: number | null }) => void,
) {
  const [status, setStatus] = useState<LoadStatus>('idle');
  const [state, setState] = useState<CardsState>({ cards: [], boards: [], pdfIsCurrent: false });
  const [rejected, setRejected] = useState<RejectedCardFile[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const latest = useRef(state);
  latest.current = state;
  const localUrls = useRef(new Set<string>());
  const countsRef = useRef(onCountsChange);
  countsRef.current = onCountsChange;

  useEffect(() => {
    const urls = localUrls.current;
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const load = useCallback(async (id: string) => {
    setStatus('loading');
    const build = await SeasonalRepository.getBuild(id);
    const urls = build ? await SeasonalRepository.getCardUrls(build.cards.map((card) => card.path)) : null;
    if (!build || !urls) {
      setStatus('failed');
      return;
    }
    const cards = build.cards.map((card) => ({ ...card, id: card.path, url: urls.get(card.path) as string }));
    const next = { cards, boards: build.boards, pdfIsCurrent: build.pdfIsCurrent };
    latest.current = next;
    setState(next);
    setStatus('ready');
  }, []);

  useEffect(() => {
    if (loteriaId && status === 'idle') void load(loteriaId);
  }, [loteriaId, status, load]);

  /** Guarda el estado nuevo; si falla lo dice, y lo que se ve queda igual para reintentar con el siguiente cambio. */
  const commit = useCallback(
    async (next: CardsState) => {
      latest.current = next;
      setState(next);
      if (!loteriaId) return false;
      const build: SeasonalBuild = { cards: next.cards.map(toStored), boards: next.boards, pdfIsCurrent: next.pdfIsCurrent };
      const saved = await SeasonalRepository.saveBuild(loteriaId, build);
      setSaveFailed(!saved);
      return saved;
    },
    [loteriaId],
  );

  /** Cambio de cartas: los tableros y el PDF dejan de corresponder. */
  const commitCards = useCallback(
    async (cards: WizardCard[]) => {
      countsRef.current({ cardCount: cards.length, boardCount: null });
      return commit({ cards, boards: [], pdfIsCurrent: false });
    },
    [commit],
  );

  const addFiles = useCallback(
    async (files: readonly File[]) => {
      if (!loteriaId || files.length === 0) return;
      setIsAdding(true);
      const failures: RejectedCardFile[] = [];
      const added: WizardCard[] = [];
      // De una en una: preparar 54 imágenes grandes a la vez puede agotar la memoria del navegador.
      for (const file of [...files].sort((a, b) => byFileName.compare(a.name, b.name))) {
        const rejection = validateCardFile(file);
        if (rejection) {
          failures.push({ fileName: file.name, reason: rejection });
          continue;
        }
        try {
          const { blob, offRatio } = await prepareSeasonalCard(file);
          const path = await SeasonalRepository.uploadCard(loteriaId, blob);
          if (!path) {
            failures.push({ fileName: file.name, reason: 'No se pudo subir. Revisa tu conexión.' });
            continue;
          }
          const url = URL.createObjectURL(blob);
          localUrls.current.add(url);
          added.push({ id: path, path, fileName: file.name, offRatio, url });
          setState((prev) => ({ ...prev, cards: [...prev.cards, added[added.length - 1]] }));
        } catch (error) {
          logger.error(`Carta temática: no se pudo preparar ${file.name}:`, error);
          failures.push({ fileName: file.name, reason: 'No se pudo leer la imagen.' });
        }
      }
      setRejected(failures);
      if (added.length > 0) await commitCards([...latest.current.cards.filter((card) => !added.includes(card)), ...added]);
      setIsAdding(false);
    },
    [loteriaId, commitCards],
  );

  const removeCard = useCallback(
    async (id: string) => {
      const removed = latest.current.cards.find((card) => card.id === id);
      if (!removed) return;
      if (await commitCards(latest.current.cards.filter((card) => card.id !== id))) {
        await SeasonalRepository.removeCards([removed.path]);
      }
    },
    [commitCards],
  );

  /**
   * Sustituye todas las cartas por estas imágenes, en este orden («Usar estas cartas», FEAT-50 US A4). Si
   * alguna no se puede preparar o subir, no cambia nada y borra lo que alcanzó a subir.
   */
  const replaceAll = useCallback(
    async (images: readonly { blob: Blob; fileName: string }[]) => {
      if (!loteriaId || images.length === 0) return false;
      setIsAdding(true);
      const added: WizardCard[] = [];
      for (const { blob, fileName } of images) {
        try {
          const prepared = await prepareSeasonalCard(blob);
          const path = await SeasonalRepository.uploadCard(loteriaId, prepared.blob);
          if (!path) break;
          const url = URL.createObjectURL(prepared.blob);
          localUrls.current.add(url);
          added.push({ id: path, path, fileName, offRatio: prepared.offRatio, url });
        } catch (error) {
          logger.error(`Carta temática: no se pudo preparar ${fileName}:`, error);
          break;
        }
      }
      if (added.length < images.length) {
        await SeasonalRepository.removeCards(added.map((card) => card.path));
        setIsAdding(false);
        return false;
      }
      const previous = latest.current.cards;
      const saved = await commitCards(added);
      if (saved) await SeasonalRepository.removeCards(previous.map((card) => card.path));
      setIsAdding(false);
      return saved;
    },
    [loteriaId, commitCards],
  );

  const reorderCards = useCallback((cards: WizardCard[]) => commitCards(cards), [commitCards]);

  const setBoards = useCallback(
    (boards: number[][]) => {
      countsRef.current({ cardCount: latest.current.cards.length, boardCount: null });
      return commit({ ...latest.current, boards, pdfIsCurrent: false });
    },
    [commit],
  );

  /** Portada y muestras elegidas en la Vitrina: no cambian las cartas ni los tableros. */
  const setShowcase = useCallback((cards: WizardCard[]) => commit({ ...latest.current, cards }), [commit]);

  const setPdfIsCurrent = useCallback(
    (pdfIsCurrent: boolean) => (latest.current.pdfIsCurrent === pdfIsCurrent ? Promise.resolve(true) : commit({ ...latest.current, pdfIsCurrent })),
    [commit],
  );

  return {
    status,
    ...state,
    rejected,
    isAdding,
    saveFailed,
    retry: () => {
      if (loteriaId) void load(loteriaId);
    },
    addFiles,
    removeCard,
    reorderCards,
    replaceAll,
    setBoards,
    setShowcase,
    setPdfIsCurrent,
  };
}

export type WizardCardsState = ReturnType<typeof useWizardCards>;
