import { Board } from '../../types';
import { BoardCell } from './BoardCell';
import './BoardModal.css';

interface BoardModalProps {
  board: Board;
  index: number;
  isOpen: boolean;
  onClose: () => void;
}

export const BoardModal = ({ board, index, isOpen, onClose }: BoardModalProps) => {
  if (!isOpen) return null;

  // Organize cards in 4x4 grid
  const grid: (typeof board.cards[0] | null)[][] = [];
  for (let i = 0; i < 4; i++) {
    grid[i] = [];
    for (let j = 0; j < 4; j++) {
      const cardIndex = i * 4 + j;
      grid[i][j] = board.cards[cardIndex] || null;
    }
  }

  return (
    <div 
      className="board-modal__overlay" 
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="board-modal__content">
        <div className="board-modal__header">
          <h2 className="board-modal__title">Tablero {index + 1}</h2>
          <button 
            className="board-modal__close"
            onClick={onClose}
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>
        
        <div className="board-modal__grid">
          {grid.map((row, rowIndex) =>
            row.map((card, colIndex) => (
              <div key={`${rowIndex}-${colIndex}`} className="board-modal__cell">
                {card ? <BoardCell card={card} /> : null}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

