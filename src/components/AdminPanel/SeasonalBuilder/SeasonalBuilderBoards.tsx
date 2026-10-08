import { useState } from 'react';
import type { GridSize } from '../../../types';
import { generateUniqueBoards, maxUniqueBoards, suggestedBoardCount } from '../../../utils/boardGeneration';
import type { SeasonalCard } from './useSeasonalCards';

interface SeasonalBuilderBoardsProps {
  cards: readonly SeasonalCard[];
  gridSize: GridSize;
  boards: readonly SeasonalCard[][];
  onBoardsChange: (boards: SeasonalCard[][]) => void;
}

/** Texto del campo → cantidad válida, o el aviso que explica por qué no lo es. */
function parseBoardCount(text: string, max: number): { count: number } | { error: string } {
  if (!/^\d+$/.test(text.trim())) return { error: 'Escribe un número entero.' };
  const count = parseInt(text, 10);
  if (count < 1) return { error: 'Genera al menos un tablero.' };
  if (count > max) return { error: `Con estas cartas se pueden generar hasta ${max} tableros distintos.` };
  return { count };
}

/** Paso 2: generar los tableros con las cartas cargadas. No se escribe ningún nombre: la carta ya lo trae. */
export const SeasonalBuilderBoards = ({ cards, gridSize, boards, onBoardsChange }: SeasonalBuilderBoardsProps) => {
  const suggested = suggestedBoardCount(cards.length, gridSize);
  const [countText, setCountText] = useState(() => String(boards.length > 0 ? boards.length : suggested));
  const [error, setError] = useState<string | null>(null);
  const columns = gridSize === 9 ? 3 : 4;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseBoardCount(countText, maxUniqueBoards(cards.length, gridSize));
    if ('error' in parsed) {
      setError(parsed.error);
      return;
    }
    setError(null);
    onBoardsChange(generateUniqueBoards(cards, parsed.count, gridSize));
  };

  return (
    <section aria-labelledby="seasonal-builder-boards-title">
      <h2 id="seasonal-builder-boards-title" className="seasonal-builder__section-title">
        Tableros
        {boards.length > 0 && (
          <span className="seasonal-builder__count" aria-live="polite">
            {boards.length}
          </span>
        )}
      </h2>

      <form className="seasonal-builder__board-form" onSubmit={handleSubmit} noValidate>
        <div className="admin-packs__field">
          <label htmlFor="seasonal-builder-board-count">¿Cuántos tableros?</label>
          <input
            id="seasonal-builder-board-count"
            type="text"
            inputMode="numeric"
            value={countText}
            onChange={(e) => setCountText(e.target.value)}
            aria-describedby={error ? 'seasonal-builder-board-count-error' : 'seasonal-builder-board-count-hint'}
          />
        </div>
        <button type="submit" className="admin-packs__btn admin-packs__btn--primary">
          {boards.length > 0 ? 'Volver a generar' : 'Generar tableros'}
        </button>
      </form>
      {error ? (
        <p className="admin-packs__error" id="seasonal-builder-board-count-error" role="alert">
          {error}
        </p>
      ) : (
        <p className="seasonal-builder__hint seasonal-builder__hint--tight" id="seasonal-builder-board-count-hint">
          Sugeridos para {cards.length} cartas en {columns}×{columns}: {suggested}.
        </p>
      )}

      {boards.length === 0 ? (
        <p className="seasonal-builder__hint">Todavía no hay tableros generados.</p>
      ) : (
        <ol className="seasonal-builder__boards">
          {boards.map((board, index) => (
            <li key={index} className="seasonal-builder__board">
              <h3 className="seasonal-builder__board-title">Tablero {index + 1}</h3>
              <div
                className={`seasonal-builder__board-grid seasonal-builder__board-grid--${columns}`}
                role="img"
                aria-label={`Tablero ${index + 1}, con ${board.length} cartas`}
              >
                {board.map((card) => (
                  <img key={card.id} src={card.url} alt="" loading="lazy" />
                ))}
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
};
