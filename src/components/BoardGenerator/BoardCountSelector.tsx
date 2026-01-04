import { useState } from 'react';
import './BoardCountSelector.css';

const MIN_BOARDS = 8;

interface BoardCountSelectorProps {
  onGenerate: (count: number) => void;
}

export const BoardCountSelector = ({ onGenerate }: BoardCountSelectorProps) => {
  const [boardCount, setBoardCount] = useState<number>(MIN_BOARDS);
  const [error, setError] = useState<string>('');

  const handleCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    
    if (isNaN(value)) {
      setBoardCount(MIN_BOARDS);
      setError('');
      return;
    }

    if (value < MIN_BOARDS) {
      setError(`El mínimo es ${MIN_BOARDS} tableros`);
      setBoardCount(value);
    } else {
      setError('');
      setBoardCount(value);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (boardCount < MIN_BOARDS) {
      setError(`El mínimo es ${MIN_BOARDS} tableros`);
      return;
    }

    onGenerate(boardCount);
  };

  return (
    <div className="board-count-selector">
      <h2 className="board-count-selector__title">Cantidad de Tableros</h2>
      
      <div className="board-count-selector__info">
        Cada tablero tendrá 16 cartas únicas. Las cartas pueden repetirse entre diferentes tableros.
      </div>

      <form onSubmit={handleSubmit} className="board-count-selector__form">
        <div className="board-count-selector__input-group">
          <label htmlFor="board-count" className="board-count-selector__label">
            Número de tableros (mínimo {MIN_BOARDS}):
          </label>
          <input
            id="board-count"
            type="number"
            min={MIN_BOARDS}
            value={boardCount}
            onChange={handleCountChange}
            className="board-count-selector__input"
          />
          {error && <div className="board-count-selector__error">{error}</div>}
        </div>

        <button
          type="submit"
          disabled={boardCount < MIN_BOARDS}
          className="board-count-selector__button"
        >
          Generar Tableros
        </button>
      </form>
    </div>
  );
};

