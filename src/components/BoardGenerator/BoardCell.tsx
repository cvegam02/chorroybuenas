import { Card } from '../../types';
import './BoardCell.css';

interface BoardCellProps {
  card: Card;
}

export const BoardCell = ({ card }: BoardCellProps) => {
  return (
    <div className="board-cell">
      <div className="board-cell__image-container">
        <img src={card.image} alt={card.title} className="board-cell__image" />
      </div>
      <div className="board-cell__title">{card.title}</div>
    </div>
  );
};

