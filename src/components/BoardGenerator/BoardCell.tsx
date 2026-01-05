import { Card } from '../../types';
import './BoardCell.css';

interface BoardCellProps {
  card: Card;
}

export const BoardCell = ({ card }: BoardCellProps) => {
  const handleImageContextMenu = (e: React.MouseEvent<HTMLImageElement>) => {
    e.preventDefault(); // Prevent right-click context menu
  };

  const handleImageDragStart = (e: React.DragEvent<HTMLImageElement>) => {
    e.preventDefault(); // Prevent dragging images
  };

  return (
    <div className="board-cell">
      <div className="board-cell__image-container">
        {card.image ? (
          <img 
            src={card.image} 
            alt={card.title} 
            className="board-cell__image"
            onContextMenu={handleImageContextMenu}
            onDragStart={handleImageDragStart}
            draggable={false}
          />
        ) : (
          <div className="board-cell__image-placeholder">Sin imagen</div>
        )}
      </div>
      <div className="board-cell__title">{card.title}</div>
    </div>
  );
};

