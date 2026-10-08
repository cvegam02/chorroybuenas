import { useRef, useState } from 'react';
import { FaExclamationTriangle, FaImages, FaTimes } from 'react-icons/fa';
import type { GridSize } from '../../../types';
import {
  SEASONAL_CARD_ACCEPTED_MIME_TYPES,
  SEASONAL_EXPECTED_CARDS,
  seasonalMinCards,
  cardCountStatus,
  hasEnoughCards,
} from '../../../utils/seasonalCards';
import type { SeasonalCardsState } from './useSeasonalCards';

interface SeasonalBuilderCardsProps extends SeasonalCardsState {
  gridSize: GridSize;
}

function countMessage(count: number, gridSize: GridSize): string | null {
  if (count === 0) return null;
  if (!hasEnoughCards(count, gridSize)) {
    return `Hacen falta al menos ${seasonalMinCards(gridSize)} cartas para generar tableros.`;
  }
  const status = cardCountStatus(count);
  if (status.kind === 'missing') {
    return `Faltan ${status.difference} para las ${SEASONAL_EXPECTED_CARDS} de una lotería tradicional. Puedes continuar así.`;
  }
  if (status.kind === 'extra') {
    return `Sobran ${status.difference} respecto a las ${SEASONAL_EXPECTED_CARDS} de una lotería tradicional. Puedes continuar así.`;
  }
  return null;
}

/** Paso 1: subir las cartas por lote. Se muestran completas y sin nombre: ya lo traen dibujado. */
export const SeasonalBuilderCards = ({ cards, rejected, isAdding, addFiles, removeCard, gridSize }: SeasonalBuilderCardsProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const offRatioCards = cards.filter((card) => card.offRatio);
  const message = countMessage(cards.length, gridSize);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    // Se limpia para poder volver a elegir los mismos archivos.
    e.target.value = '';
    void addFiles(files);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (isAdding) return;
    void addFiles(Array.from(e.dataTransfer.files));
  };

  return (
    <section aria-labelledby="seasonal-builder-cards-title">
      <h2 id="seasonal-builder-cards-title" className="seasonal-builder__section-title">
        Cartas
        <span className="seasonal-builder__count" aria-live="polite">
          {cards.length} de {SEASONAL_EXPECTED_CARDS}
        </span>
      </h2>

      <div
        className={`seasonal-builder__dropzone${isDragging ? ' seasonal-builder__dropzone--dragging' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <FaImages className="seasonal-builder__dropzone-icon" aria-hidden="true" />
        <p className="seasonal-builder__dropzone-text">
          Arrastra aquí todas las cartas, o elígelas. Deben traer ya su nombre dibujado: se usan completas, sin
          recortar.
        </p>
        <button
          type="button"
          className="admin-packs__btn admin-packs__btn--secondary"
          onClick={() => inputRef.current?.click()}
          disabled={isAdding}
        >
          {isAdding ? 'Preparando cartas…' : cards.length > 0 ? 'Agregar más cartas' : 'Elegir cartas'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={SEASONAL_CARD_ACCEPTED_MIME_TYPES.join(',')}
          multiple
          onChange={handleInputChange}
          aria-label="Imágenes de las cartas"
          hidden
        />
      </div>

      {message && (
        <p className="seasonal-builder__notice" role="status">
          {message}
        </p>
      )}

      {offRatioCards.length > 0 && (
        <div className="seasonal-builder__notice" role="status">
          <p>
            <FaExclamationTriangle aria-hidden="true" />{' '}
            {offRatioCards.length === 1
              ? 'Esta carta no viene en proporción 2:3. Se usará completa, con franjas blancas:'
              : `Estas ${offRatioCards.length} cartas no vienen en proporción 2:3. Se usarán completas, con franjas blancas:`}
          </p>
          <ul className="seasonal-builder__file-list">
            {offRatioCards.map((card) => (
              <li key={card.id}>{card.fileName}</li>
            ))}
          </ul>
        </div>
      )}

      {rejected.length > 0 && (
        <div className="admin-packs__error" role="alert">
          <p>
            {rejected.length === 1 ? 'Este archivo no se cargó:' : `Estos ${rejected.length} archivos no se cargaron:`}
          </p>
          <ul className="seasonal-builder__file-list">
            {rejected.map((file, index) => (
              <li key={`${file.fileName}-${index}`}>
                {file.fileName} — {file.reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {cards.length === 0 && !isAdding ? (
        <p className="seasonal-builder__hint">Todavía no hay cartas cargadas.</p>
      ) : (
        <ul className="seasonal-builder__grid">
          {cards.map((card) => (
            <li
              key={card.id}
              className={`seasonal-builder__card${card.offRatio ? ' seasonal-builder__card--off-ratio' : ''}`}
            >
              <img src={card.url} alt={card.fileName} loading="lazy" />
              {card.offRatio && <span className="seasonal-builder__card-badge">No es 2:3</span>}
              <button
                type="button"
                className="seasonal-builder__card-remove"
                onClick={() => removeCard(card.id)}
                aria-label={`Quitar ${card.fileName}`}
                title="Quitar"
              >
                <FaTimes aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
