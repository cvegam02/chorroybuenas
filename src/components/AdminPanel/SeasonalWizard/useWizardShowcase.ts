import { useState } from 'react';
import { logger } from '../../../utils/logger';
import { coverIndex, sampleIndexes, setCoverCard, toggleSample } from '../../../utils/seasonalBuild';
import { createProtectedPreview, validatePreviewImage } from '../../../utils/seasonalPreview';
import {
  pendingPreviewItem,
  savePreviewSelection,
  storedPreviewItem,
  type PreviewItem,
  type SavedPreviews,
} from '../seasonalPreviewItems';
import type { WizardCard, WizardCardsState } from './useWizardCards';
import { buildsOnSite, type CardsMode } from './WizardCardsStep';
import type { useWizardDraft } from './useWizardDraft';

type Draft = ReturnType<typeof useWizardDraft>;

const sameList = (a: readonly (string | null)[], b: readonly (string | null)[]) =>
  a.length === b.length && a.every((item, index) => item === b[index]);

/** La copia protegida de una carta: la ya subida, o una nueva hecha de la carta guardada. */
async function previewOfCard(card: WizardCard): Promise<PreviewItem> {
  if (card.previewPath) return storedPreviewItem(card.previewPath);
  const response = await fetch(card.url);
  if (!response.ok) throw new Error(`No se pudo leer la carta ${card.fileName}`);
  return pendingPreviewItem(await createProtectedPreview(await response.blob()));
}

/**
 * Vitrina del asistente (FEAT-48, decisiones 13 y 19). Con «Subir mis cartas», portada y muestras se eligen
 * de las cartas (por omisión, la portada es la primera) o la portada se sube aparte; con «Ya tengo el PDF»,
 * se suben como imágenes. `sync` les pone la marca de agua, las sube y las guarda en la ficha.
 */
export function useWizardShowcase(draft: Draft, cards: WizardCardsState, mode: CardsMode) {
  const record = draft.record;
  // undefined = sin tocar: se toma lo guardado.
  const [ownCoverEdit, setOwnCoverEdit] = useState<PreviewItem | null | undefined>(undefined);
  const [pdfEdit, setPdfEdit] = useState<SavedPreviews | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const storedCover = record?.cover_path ?? null;
  const storedSamples = record?.sample_paths ?? [];
  const storedOwnCover =
    storedCover && !cards.cards.some((card) => card.previewPath === storedCover) ? storedPreviewItem(storedCover) : null;
  const ownCover = ownCoverEdit === undefined ? storedOwnCover : ownCoverEdit;
  const cover = coverIndex(cards.cards, ownCover !== null);
  const samples = sampleIndexes(cards.cards, cover);

  const pdfCover = pdfEdit ? pdfEdit.cover : storedCover ? storedPreviewItem(storedCover) : null;
  const pdfSamples = pdfEdit ? pdfEdit.samples : storedSamples.map(storedPreviewItem);

  const wantedCover = ownCover ? ownCover.path : cover === null ? null : (cards.cards[cover].previewPath ?? null);
  const wantedSamples = samples.map((index) => cards.cards[index].previewPath ?? null);
  const hasLeftovers = cards.cards.some((card, index) => card.previewPath && index !== cover && !samples.includes(index));
  const needsSync =
    buildsOnSite(mode)
      ? cards.status === 'ready' &&
        (hasLeftovers ||
          (cover !== null && !ownCover && !cards.cards[cover].previewPath) ||
          wantedSamples.includes(null) ||
          (ownCover !== null && ownCover.path === null) ||
          wantedCover !== storedCover ||
          !sameList(wantedSamples, storedSamples))
      : pdfEdit !== null;

  const toggle = (index: number) => void cards.setShowcase(toggleSample(cards.cards, index, cover));

  const chooseCover = (index: number) => {
    setOwnCoverEdit(null);
    void cards.setShowcase(setCoverCard(cards.cards, index));
  };

  const uploadOwnCover = async (file: File) => {
    const rejection = validatePreviewImage(file);
    if (rejection) {
      setError(rejection);
      return;
    }
    setIsPreparing(true);
    setError(null);
    try {
      setOwnCoverEdit(pendingPreviewItem(await createProtectedPreview(file)));
      void cards.setShowcase(setCoverCard(cards.cards, null));
    } catch (prepareError: unknown) {
      logger.error('Vitrina: no se pudo preparar la portada', file.name, prepareError);
      setError('No se pudo preparar la imagen de la portada.');
    }
    setIsPreparing(false);
  };

  const syncCards = async (loteriaId: string): Promise<boolean> => {
    const previous = [storedCover, ...storedSamples, ...cards.cards.map((card) => card.previewPath ?? null)];
    const coverItem = ownCover ?? (cover === null ? null : await previewOfCard(cards.cards[cover]));
    const sampleItems = await Promise.all(samples.map((index) => previewOfCard(cards.cards[index])));
    const saved = await savePreviewSelection(loteriaId, coverItem, sampleItems, previous);
    // Las copias hechas aquí ya se subieron (o se vuelven a hacer en el reintento): sus direcciones locales sobran.
    [ownCover ? null : coverItem, ...sampleItems].forEach((item) => item?.blob && URL.revokeObjectURL(item.url));
    if (!saved.ok) return false;

    const pathOf = new Map<number, string | null>(samples.map((index, k) => [index, saved.samples[k]?.path ?? null]));
    if (cover !== null && !ownCover) pathOf.set(cover, saved.cover?.path ?? null);
    const next = cards.cards.map((card, index) => {
      const path = pathOf.get(index);
      if (path) return { ...card, previewPath: path };
      const copy = { ...card };
      delete copy.previewPath;
      return copy;
    });
    await cards.setShowcase(next);
    if (ownCover) setOwnCoverEdit(saved.cover);
    draft.patchRecord({ cover_path: saved.cover?.path ?? null, sample_paths: saved.samples.flatMap((item) => (item.path ? [item.path] : [])) });
    return true;
  };

  const syncPdf = async (loteriaId: string): Promise<boolean> => {
    if (!pdfEdit) return true;
    const saved = await savePreviewSelection(loteriaId, pdfEdit.cover, pdfEdit.samples, [storedCover, ...storedSamples]);
    if (!saved.ok) {
      setPdfEdit({ cover: saved.cover, samples: saved.samples });
      return false;
    }
    setPdfEdit(null);
    draft.patchRecord({ cover_path: saved.cover?.path ?? null, sample_paths: saved.samples.flatMap((item) => (item.path ? [item.path] : [])) });
    return true;
  };

  /** Pone la marca de agua a lo elegido, lo sube y lo guarda en la ficha. Solo si algo cambió. */
  const sync = async (): Promise<boolean> => {
    if (!needsSync || !record) return true;
    setIsSaving(true);
    setError(null);
    let ok = false;
    try {
      ok = buildsOnSite(mode) ? await syncCards(record.id) : await syncPdf(record.id);
    } catch (syncError: unknown) {
      logger.error('Vitrina: no se pudieron guardar portada y muestras', syncError);
    }
    setIsSaving(false);
    if (!ok) setError('No se pudieron guardar la portada y las muestras. Revisa tu conexión e intenta de nuevo.');
    return ok;
  };

  return {
    cover,
    samples,
    ownCover,
    pdfCover,
    pdfSamples,
    isSaving,
    isPreparing,
    error,
    toggle,
    chooseCover,
    uploadOwnCover,
    setPdfCover: (item: PreviewItem | null) => setPdfEdit({ cover: item, samples: pdfSamples }),
    setPdfSamples: (items: PreviewItem[]) => setPdfEdit({ cover: pdfCover, samples: items }),
    sync,
  };
}

export type WizardShowcaseState = ReturnType<typeof useWizardShowcase>;
