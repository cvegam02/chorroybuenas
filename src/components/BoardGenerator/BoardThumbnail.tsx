import { Board } from '../../types';
import './BoardThumbnail.css';

interface BoardThumbnailProps {
  board: Board;
  index: number;
  onClick: () => void;
}

export const BoardThumbnail = ({ board, index, onClick }: BoardThumbnailProps) => {

  // Create a small preview grid (4x4, but smaller)
  const grid: (typeof board.cards[0] | null)[][] = [];
  for (let i = 0; i < 4; i++) {
    grid[i] = [];
    for (let j = 0; j < 4; j++) {
      const cardIndex = i * 4 + j;
      grid[i][j] = board.cards[cardIndex] || null;
    }
  }

  return (
    <div className="board-thumbnail">
      <div className="board-thumbnail__header" onClick={onClick}>
        <h3 className="board-thumbnail__title">Tablero {index + 1}</h3>
        <span className="board-thumbnail__click-hint">👆 Click para ver completo</span>
      </div>
      <div className="board-thumbnail__grid" onClick={onClick}>
        {grid.map((row, rowIndex) =>
          row.map((card, colIndex) => (
            <div 
              key={`${rowIndex}-${colIndex}`} 
              className="board-thumbnail__cell"
            >
              {card ? (
                <div className="board-thumbnail__card">
                  {card.image ? (
                    <img 
                      src={card.image} 
                      alt={card.title} 
                      className="board-thumbnail__card-image"
                      onContextMenu={(e) => e.preventDefault()}
                      onDragStart={(e) => e.preventDefault()}
                      draggable={false}
                    />
                  ) : (
                    <div className="board-thumbnail__card-placeholder">Sin imagen</div>
                  )}
                  <span className="board-thumbnail__card-title">{card.title}</span>
                </div>
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

