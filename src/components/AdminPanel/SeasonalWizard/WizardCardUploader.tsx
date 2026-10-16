import { useRef, useState } from 'react';
import { FaTimes } from 'react-icons/fa';
import type { GridSize } from '../../../types';
import { useDragReorder } from '../../../hooks/useDragReorder';
import { cardCountMessage, cardProgress, offRatioNotice } from '../../../utils/seasonalBuild';
import { SEASONAL_CARD_ACCEPTED_MIME_TYPES, SEASONAL_EXPECTED_CARDS } from '../../../utils/seasonalCards';
import type { WizardCardsState } from './useWizardCards';

interface WizardCardUploaderProps {
  cards: WizardCardsState;
  gridSize: GridSize;
}

/** «Subir mis cartas» (FEAT-48, decisión 11): contador, carga por lote, reordenar arrastrando y quitar. */
export const WizardCardUploader = ({ cards, gridSize }: WizardCardUploaderProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDropping, setIsDropping] = useState(false);
  const reorder = useDragReorder(cards.cards, (card) => card.id, (next) => void cards.reorderCards(next));
  const busy = cards.isAdding || cards.status !== 'ready';
  const notice = offRatioNotice(cards.cards);

  if (cards.status === 'loading' || cards.status === 'idle') {
    return <p className="seasonal-wizard__muted">Cargando las cartas…</p>;
  }
  if (cards.status === 'failed') {
    return (
      <div className="seasonal-wizard__pending">
        <p className="seasonal-wizard__field-error">No se pudieron cargar las cartas guardadas.</p>
        <button type="button" className="seasonal-wizard__btn" onClick={cards.retry}>
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="seasonal-wizard__counter">
        <div className="seasonal-wizard__counter-row">
          <b aria-live="polite">
            {cards.cards.length} de {SEASONAL_EXPECTED_CARDS} cartas
          </b>
          <span className="seasonal-wizard__muted">{cardCountMessage(cards.cards.length, gridSize)}</span>
        </div>
        <div className="seasonal-wizard__bar" aria-hidden="true">
          <div className="seasonal-wizard__bar-fill" style={{ width: `${cardProgress(cards.cards.length) * 100}%` }} />
        </div>
      </div>

      <div
        className={`seasonal-wizard__dropzone${isDropping ? ' seasonal-wizard__dropzone--on' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDropping(true);
        }}
        onDragLeave={() => setIsDropping(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDropping(false);
          if (!busy) void cards.addFiles(Array.from(e.dataTransfer.files));
        }}
      >
        <b>Arrastra aquí tus cartas o</b>
        <button type="button" className="seasonal-wizard__btn" onClick={() => inputRef.current?.click()} disabled={busy}>
          {cards.isAdding ? 'Preparando y subiendo cartas…' : 'Elegir imágenes'}
        </button>
        <span className="seasonal-wizard__muted">Cartas completas, en proporción 2:3. Puedes subir varias a la vez.</span>
        <input
          ref={inputRef}
          type="file"
          accept={SEASONAL_CARD_ACCEPTED_MIME_TYPES.join(',')}
          multiple
          hidden
          aria-label="Imágenes de las cartas"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            // Se limpia para poder volver a elegir los mismos archivos.
            e.target.value = '';
            void cards.addFiles(files);
          }}
        />
      </div>

      {cards.rejected.length > 0 && (
        <div className="seasonal-wizard__field-error" role="alert">
          {cards.rejected.length === 1 ? 'Este archivo no se cargó:' : `Estos ${cards.rejected.length} archivos no se cargaron:`}
          <ul className="seasonal-wizard__file-list">
            {cards.rejected.map((file, index) => (
              <li key={`${file.fileName}-${index}`}>
                {file.fileName} — {file.reason}
              </li>
            ))}
          </ul>
        </div>
      )}
      {cards.saveFailed && (
        <p className="seasonal-wizard__field-error" role="alert">
          No se pudo guardar el último cambio de cartas. Revisa tu conexión y vuelve a intentarlo.
        </p>
      )}

      {cards.cards.length > 0 && (
        <ul className="seasonal-wizard__cards">
          {reorder.shown.map((card) => {
            const number = cards.cards.indexOf(card) + 1;
            return (
              <li
                key={card.id}
                ref={reorder.register(card.id)}
                className={`seasonal-wizard__card${card.offRatio ? ' seasonal-wizard__card--off' : ''}${reorder.draggingKey === card.id ? ' seasonal-wizard__card--dragging' : ''}`}
              >
                <button
                  type="button"
                  className="seasonal-wizard__card-handle"
                  aria-label={`Carta ${number}, ${card.fileName}: arrastra o usa las flechas para moverla`}
                  {...reorder.handleProps(card)}
                >
                  <img src={card.url} alt="" draggable={false} />
                </button>
                <span className="seasonal-wizard__card-number">{number}</span>
                {card.offRatio && <span className="seasonal-wizard__card-badge">2:3</span>}
                <button
                  type="button"
                  className="seasonal-wizard__card-remove"
                  aria-label={`Quitar la carta ${number}`}
                  onClick={() => void cards.removeCard(card.id)}
                  disabled={busy}
                >
                  <FaTimes aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <p className="seasonal-wizard__muted">
        {notice ? `${notice} ` : ''}
        {cards.cards.length > 1 ? 'Para cambiar el orden, arrástralas.' : ''}
      </p>
    </>
  );
};
