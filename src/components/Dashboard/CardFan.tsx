import { FaPlus, FaRegImage } from 'react-icons/fa';
import type { Card } from '../../types';
import { useComposedCard } from '../../hooks/useComposedCard';
import { PREVIEW_CARD_COUNT } from '../../utils/setSummary';

interface CardFanProps {
  cards: readonly Card[];
  /** Texto bajo el hueco cuando la lotería no tiene cartas. */
  emptyLabel: string;
}

/** Una carta en chico: como sale impresa y, mientras se arma, la foto sola. Decorativa. */
export const CardThumbnail = ({ card, className }: { card: Card; className: string }) => {
  const composedUrl = useComposedCard(card);
  const imageUrl = composedUrl ?? card.image;

  return imageUrl ? (
    <img src={imageUrl} alt="" className={className} loading="lazy" />
  ) : (
    <span className={className} aria-hidden="true" />
  );
};

/** Las primeras cartas de una lotería, en abanico. Con menos de tres, un hueco punteado ocupa el lugar de la siguiente. */
export const CardFan = ({ cards, emptyLabel }: CardFanProps) => {
  if (cards.length === 0) {
    return (
      <span className="card-fan card-fan--empty">
        <span className="card-fan__slot">
          <FaRegImage aria-hidden="true" />
        </span>
        <span className="card-fan__empty-label">{emptyLabel}</span>
      </span>
    );
  }

  const shown = cards.slice(0, PREVIEW_CARD_COUNT);
  return (
    <span className={`card-fan card-fan--${shown.length}`} aria-hidden="true">
      {shown.map((card) => (
        <CardThumbnail key={card.id} card={card} className="card-fan__card" />
      ))}
      {shown.length < PREVIEW_CARD_COUNT && (
        <span className="card-fan__slot">
          <FaPlus />
        </span>
      )}
    </span>
  );
};
