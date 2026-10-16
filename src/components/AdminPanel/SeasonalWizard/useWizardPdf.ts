import { useCallback, useState } from 'react';
import { SeasonalRepository } from '../../../repositories/SeasonalRepository';
import { buildSeasonalPdf } from '../../../services/seasonalPdf';
import { boardsFromIndexes } from '../../../utils/seasonalBuild';
import { validatePdfFile } from '../../../utils/seasonalLoteria';
import type { useWizardDraft } from './useWizardDraft';
import type { WizardCardsState } from './useWizardCards';

export type PdfStage = 'idle' | 'building' | 'uploading' | 'saving';

export const PDF_STAGE_LABELS: Record<Exclude<PdfStage, 'idle'>, string> = {
  building: 'Armando el PDF…',
  uploading: 'Subiendo el PDF…',
  saving: 'Guardando la ficha…',
};

type Draft = ReturnType<typeof useWizardDraft>;

/**
 * El PDF de la lotería en el asistente (FEAT-48, decisiones 12 y 15): se arma con las cartas al terminar el
 * paso de Tableros, o se sube ya hecho. Si la lotería ya tiene ventas, antes de reemplazar su PDF se pregunta.
 */
export function useWizardPdf(draft: Draft, cards: WizardCardsState) {
  const [stage, setStage] = useState<PdfStage>('idle');
  const [error, setError] = useState<string | null>(null);
  // Mientras se pregunta si reemplazar el PDF de una lotería vendida: con qué responder.
  const [asking, setAsking] = useState<((ok: boolean) => void) | null>(null);

  const confirmReplace = useCallback(async (): Promise<boolean> => {
    const record = draft.record;
    if (!record?.pdf) return true;
    // Si no se puede saber, se pregunta igual.
    if ((await SeasonalRepository.hasApprovedSales(record.id)) === false) return true;
    return new Promise<boolean>((resolve) => setAsking(() => resolve));
  }, [draft.record]);

  const answer = (ok: boolean) => {
    asking?.(ok);
    setAsking(null);
  };

  const upload = useCallback(
    async (file: File): Promise<boolean> => {
      const record = draft.record;
      if (!record) return false;
      setStage('uploading');
      const pdf = await SeasonalRepository.uploadPdf(record.id, file, record.pdf?.path ?? null);
      if (!pdf) {
        setError('No se pudo subir el PDF. Revisa tu conexión e intenta de nuevo.');
        setStage('idle');
        return false;
      }
      draft.patchRecord({ pdf });
      return true;
    },
    [draft],
  );

  /** Arma el PDF con las cartas y los tableros guardados, lo sube y llena los números de la ficha. */
  const generate = useCallback(async (): Promise<boolean> => {
    if (!(await confirmReplace())) return false;
    setError(null);
    setStage('building');
    const name = draft.form.nameEs.trim() || 'Lotería temática';
    const built = await buildSeasonalPdf(cards.cards, boardsFromIndexes(cards.boards, cards.cards), draft.form.gridSize, name);
    if ('error' in built) {
      setError(built.error);
      setStage('idle');
      return false;
    }
    if (!(await upload(built.file))) return false;
    setStage('saving');
    await cards.setPdfIsCurrent(true);
    draft.setField('cardCount', String(cards.cards.length));
    draft.setField('boardCount', String(cards.boards.length));
    const saved = await draft.save();
    setStage('idle');
    if (!saved) {
      setError('El PDF ya quedó guardado, pero no se pudieron actualizar el número de cartas y de tableros. Intenta de nuevo.');
      return false;
    }
    return true;
  }, [cards, draft, confirmReplace, upload]);

  /** «Ya tengo el PDF»: sube el archivo que eligió el administrador. */
  const uploadOwn = useCallback(
    async (file: File): Promise<boolean> => {
      const rejection = validatePdfFile(file);
      if (rejection) {
        setError(rejection);
        return false;
      }
      if (!(await confirmReplace())) return false;
      setError(null);
      const ok = await upload(file);
      // El PDF ya no es el que se armó con las cartas guardadas.
      if (ok) await cards.setPdfIsCurrent(false);
      setStage('idle');
      return ok;
    },
    [cards, confirmReplace, upload],
  );

  return { stage, error, isAsking: asking !== null, answer, generate, uploadOwn };
}
