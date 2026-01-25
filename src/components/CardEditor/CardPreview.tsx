import { Card } from '../../types';
import './CardPreview.css';

interface CardPreviewProps {
  card: Card;
  onRemove: (id: string) => void;
  onClick?: (card: Card) => void;
}

export const CardPreview = ({ card, onRemove, onClick }: CardPreviewProps) => {
  return (
    <div
      className={`card-preview ${onClick ? 'card-preview--clickable' : ''}`}
      onClick={() => onClick?.(card)}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick(card);
        }
      }}
    >
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
        onClick={(e) => {
          e.stopPropagation();
          onRemove(card.id);
        }}
        aria-label={`Eliminar ${card.title}`}
      >
        ×
      </button>
    </div>
  );
};

