import { useState } from 'react';
import type { GridSize } from '../../../types';
import { boardsFromIndexes, boardsToIndexes } from '../../../utils/seasonalBuild';
import {
  generateSeasonalBoards,
  seasonalMaxBoards,
  seasonalSuggestedBoardCount,
  usesSameCardsOnEveryBoard,
} from '../../../utils/seasonalBoards';
import { hasEnoughCards, seasonalMinCards } from '../../../utils/seasonalCards';
import type { WizardCardsState } from './useWizardCards';
import { PDF_STAGE_LABELS, type PdfStage } from './useWizardPdf';
import { ProgressBar } from './WizardBusy';

/** Cuántos tableros se muestran de ejemplo. */
const PREVIEW_BOARDS = 4;

interface WizardBoardsStepProps {
  cards: WizardCardsState;
  gridSize: GridSize;
  /** Los tableros guardados, ya revisados contra el modo actual. */
  boards: number[][];
  pdfStage: PdfStage;
  pdfError: string | null;
}

/** Texto del campo → cantidad válida, o el aviso que explica por qué no lo es. */
function parseBoardCount(text: string, max: number): { count: number } | { error: string } {
  if (!/^\d+$/.test(text.trim())) return { error: 'Escribe un número entero.' };
  const count = parseInt(text, 10);
  if (count < 1) return { error: 'Genera al menos un tablero.' };
  if (count > max) return { error: `Con estas cartas se pueden generar hasta ${max} tableros distintos.` };
  return { count };
}

/** Paso 3 con «Subir mis cartas» (FEAT-48, decisión 12): generar los tableros; al seguir se arma el PDF. */
export const WizardBoardsStep = ({ cards, gridSize, boards, pdfStage, pdfError }: WizardBoardsStepProps) => {
  const total = cards.cards.length;
  const suggested = seasonalSuggestedBoardCount(total, gridSize);
  const [countText, setCountText] = useState(() => String(boards.length > 0 ? boards.length : suggested));
  const [error, setError] = useState<string | null>(null);
  const columns = gridSize === 9 ? 3 : 4;
  const busy = pdfStage !== 'idle';

  if (!hasEnoughCards(total, gridSize)) {
    return (
      <p className="seasonal-wizard__muted">
        Primero sube al menos {seasonalMinCards(gridSize)} cartas en el paso 2.
      </p>
    );
  }

  const generate = (count: number) => {
    setError(null);
    void cards.setBoards(boardsToIndexes(generateSeasonalBoards(cards.cards, count, gridSize), cards.cards));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseBoardCount(countText, seasonalMaxBoards(total, gridSize));
    if ('error' in parsed) {
      setError(parsed.error);
      return;
    }
    generate(parsed.count);
  };

  const preview = boardsFromIndexes(boards.slice(0, PREVIEW_BOARDS), cards.cards);

  return (
    <>
      <form className="seasonal-wizard__board-form" onSubmit={handleSubmit} noValidate>
        <div className="seasonal-wizard__label seasonal-wizard__board-count">
          <label htmlFor="wizard-boards">¿Cuántos tableros?</label>
          <input
            id="wizard-boards"
            type="text"
            inputMode="numeric"
            className="seasonal-wizard__field"
            value={countText}
            onChange={(e) => setCountText(e.target.value)}
            aria-describedby={error ? 'wizard-boards-error' : 'wizard-boards-hint'}
          />
        </div>
        <button type="submit" className="seasonal-wizard__btn seasonal-wizard__btn--primary" disabled={busy}>
          Generar tableros
        </button>
        <button
          type="button"
          className="seasonal-wizard__btn"
          onClick={() => generate(boards.length)}
          disabled={busy || boards.length === 0}
        >
          Volver a generar
        </button>
      </form>
      {error ? (
        <p className="seasonal-wizard__field-error" id="wizard-boards-error" role="alert">
          {error}
        </p>
      ) : (
        <p className="seasonal-wizard__muted" id="wizard-boards-hint">
          Sugeridos para {total} cartas en {columns} × {columns}: {suggested}.
          {usesSameCardsOnEveryBoard(total, gridSize) && ' Con las cartas justas, todos los tableros llevan las mismas y solo cambia el acomodo.'}
        </p>
      )}

      {preview.length > 0 && (
        <ol className="seasonal-wizard__boards">
          {preview.map((board, index) => (
            <li key={index} className="seasonal-wizard__board">
              <span className="seasonal-wizard__muted seasonal-wizard__board-title">Tablero {index + 1}</span>
              <div
                className={`seasonal-wizard__board-grid seasonal-wizard__board-grid--${columns}`}
                role="img"
                aria-label={`Tablero ${index + 1}, con ${board.length} cartas`}
              >
                {board.map((card, cell) => (
                  <img key={`${card.id}-${cell}`} src={card.url} alt="" loading="lazy" />
                ))}
              </div>
            </li>
          ))}
        </ol>
      )}

      {boards.length > 0 && (
        <p className="seasonal-wizard__muted" role="status">
          Mostrando {preview.length} de {boards.length}. Todos los tableros son distintos.{' '}
          {busy
            ? PDF_STAGE_LABELS[pdfStage as Exclude<PdfStage, 'idle'>]
            : cards.pdfIsCurrent
              ? 'El PDF ya está guardado con estos tableros.'
              : 'Al seguir, se arma y se guarda el PDF.'}
        </p>
      )}
      {busy && (
        <>
          <ProgressBar label={PDF_STAGE_LABELS[pdfStage as Exclude<PdfStage, 'idle'>]} />
          <p className="seasonal-wizard__muted">Puede tardar un poco. No cierres esta pestaña.</p>
        </>
      )}
      {pdfError && (
        <p className="seasonal-wizard__field-error" role="alert">
          {pdfError}
        </p>
      )}
    </>
  );
};
