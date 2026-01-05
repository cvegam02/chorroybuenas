import { Card } from '../../types';
import './CardPreview.css';

interface CardPreviewProps {
  card: Card;
  onRemove: (id: string) => void;
}

export const CardPreview = ({ card, onRemove }: CardPreviewProps) => {
  return (
    <div className="card-preview">
      <div className="card-preview__image-container">
        {card.image ? (
          <img src={card.image} alt={card.title} className="card-preview__image" />
        ) : (
          <div className="card-preview__image-placeholder">Sin imagen</div>
        )}
      </div>
      <div className="card-preview__title">{card.title}</div>
      <button
        className="card-preview__remove"
        onClick={() => onRemove(card.id)}
        aria-label={`Eliminar ${card.title}`}
      >
        ×
      </button>
    </div>
  );
};

