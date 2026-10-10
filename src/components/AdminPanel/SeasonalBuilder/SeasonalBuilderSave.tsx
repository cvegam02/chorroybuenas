import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SeasonalRepository, type AdminSeasonalLoteria } from '../../../repositories/SeasonalRepository';
import { generatePDF } from '../../../services/PDFService';
import { PdfCardsFailedError, formatFailedCardNames } from '../../../services/pdf/failedCards';
import type { Board, Card } from '../../../types';
import { logger } from '../../../utils/logger';
import {
  SEASONAL_PDF_MIME_TYPE,
  formatFileSize,
  seasonalPdfFileName,
  validatePdfFile,
  withBuiltCounts,
} from '../../../utils/seasonalLoteria';
import type { SeasonalCard } from './useSeasonalCards';

interface SeasonalBuilderSaveProps {
  loteria: AdminSeasonalLoteria;
  cards: readonly SeasonalCard[];
  boards: readonly SeasonalCard[][];
  onBack: () => void;
}

type SaveStage = 'idle' | 'building' | 'uploading' | 'saving';

const STAGE_LABELS: Record<Exclude<SaveStage, 'idle'>, string> = {
  building: 'Armando el PDF…',
  uploading: 'Subiendo el PDF…',
  saving: 'Guardando la ficha…',
};

/** Las cartas ya traen su nombre dibujado: van al PDF sin título. */
const toPdfCard = (card: SeasonalCard): Card => ({ id: card.id, title: '', image: card.url });

/** Las cartas de temporada no llevan nombre: en el aviso se identifican por el nombre de su archivo. */
const failedCardsMessage = (error: PdfCardsFailedError, cards: readonly SeasonalCard[]): string => {
  const fileNames = error.failedCards.map((failed) => cards.find((card) => card.id === failed.id)?.fileName ?? failed.id);
  const count = fileNames.length;
  const summary = count === 1 ? '1 carta no cargó' : `${count} cartas no cargaron`;
  return `No se pudo crear el PDF: ${summary} (${formatFailedCardNames(fileNames)}). Revisa tu conexión e inténtalo de nuevo.`;
};

/** Paso 3: armar el PDF y dejarlo guardado en la ficha, con el número de cartas y de tableros. */
export const SeasonalBuilderSave = ({ loteria, cards, boards, onBack }: SeasonalBuilderSaveProps) => {
  const navigate = useNavigate();
  const [stage, setStage] = useState<SaveStage>('idle');
  const [error, setError] = useState<string | null>(null);
  const isBusy = stage !== 'idle';

  const fail = (message: string) => {
    setError(message);
    setStage('idle');
  };

  const handleSave = async () => {
    setError(null);
    setStage('building');

    let file: File;
    try {
      const pdfBoards: Board[] = boards.map((board, index) => ({
        id: `tablero-${index + 1}`,
        cards: board.map(toPdfCard),
        gridSize: loteria.grid_size,
      }));
      const blob = await generatePDF(pdfBoards, {
        allCards: cards.map(toPdfCard),
        finishedCards: true,
        title: loteria.name_es,
      });
      file = new File([blob], seasonalPdfFileName(loteria.name_es), { type: SEASONAL_PDF_MIME_TYPE });
    } catch (buildError) {
      logger.error('Lotería de temporada: no se pudo armar el PDF:', buildError);
      if (buildError instanceof PdfCardsFailedError) {
        fail(failedCardsMessage(buildError, cards));
        return;
      }
      fail('No se pudo armar el PDF. Tus cartas y tableros siguen aquí: intenta de nuevo.');
      return;
    }

    const rejection = validatePdfFile(file);
    if (rejection) {
      fail(`El PDF quedó de ${formatFileSize(file.size)}. ${rejection} Genera menos tableros y vuelve a intentar.`);
      return;
    }

    setStage('uploading');
    const uploaded = await SeasonalRepository.uploadPdf(loteria.id, file, loteria.pdf?.path ?? null);
    if (!uploaded) {
      fail('No se pudo subir el PDF. Tus cartas y tableros siguen aquí: revisa tu conexión e intenta de nuevo.');
      return;
    }

    setStage('saving');
    const savedId = await SeasonalRepository.saveLoteria(loteria.id, withBuiltCounts(loteria, cards.length, boards.length));
    if (!savedId) {
      fail(
        'El PDF ya quedó guardado, pero no se pudieron actualizar el número de cartas y de tableros. Intenta de nuevo, o escríbelos en la ficha.',
      );
      return;
    }

    navigate('/admin', { state: { tab: 'temporada', openLoteriaId: loteria.id } });
  };

  return (
    <section aria-labelledby="seasonal-builder-save-title">
      <h2 id="seasonal-builder-save-title" className="seasonal-builder__section-title">
        Guardar en la ficha
      </h2>

      <ul className="seasonal-builder__summary">
        <li>
          <strong>{boards.length}</strong> tableros de {loteria.grid_size === 9 ? '3×3' : '4×4'}
        </li>
        <li>
          <strong>{cards.length}</strong> cartas en la baraja para recortar
        </li>
      </ul>
      <p className="seasonal-builder__hint seasonal-builder__hint--tight">
        Se arma el PDF con los tableros y después la baraja, se guarda en la ficha de «{loteria.name_es}» y se llenan
        su número de cartas y de tableros. Las cartas no se guardan: solo el PDF.
      </p>

      {loteria.pdf && (
        <p className="seasonal-builder__notice" role="status">
          Esta lotería ya tiene un PDF ({loteria.pdf.name}). Al guardar se reemplaza; si ya tiene ventas, quienes la
          compraron descargarán la versión nueva.
        </p>
      )}

      {error && (
        <p className="admin-packs__error" role="alert">
          {error}
        </p>
      )}

      <div className="seasonal-builder__actions">
        <button type="button" className="admin-packs__btn admin-packs__btn--secondary" onClick={onBack} disabled={isBusy}>
          Volver a los tableros
        </button>
        <button type="button" className="admin-packs__btn admin-packs__btn--primary" onClick={handleSave} disabled={isBusy}>
          {isBusy ? STAGE_LABELS[stage] : 'Guardar en la ficha'}
        </button>
      </div>
      {isBusy && (
        <p className="seasonal-builder__hint seasonal-builder__hint--tight" role="status">
          Puede tardar un poco. No cierres esta pestaña.
        </p>
      )}
    </section>
  );
};
