import type { Card } from '../../types';
import { useComposedCard } from '../../hooks/useComposedCard';
import { useCardLabels } from '../../contexts/CardLabelsContext';
import { nameGoesBelow } from '../../utils/callerGame';

interface CallerCardProps {
  card: Card;
  /** Tocar la carta saca la siguiente; sin esto (fin de la baraja) no se puede tocar. */
  onTap?: () => void;
  tapLabel: string;
}

/**
 * La carta cantada en grande, como sale impresa. El nombre va abajo solo si la carta no lo trae dibujado
 * (FEAT-55, decisión 5); mientras se compone, se ve la foto con su nombre abajo.
 */
export const CallerCard = ({ card, onTap, tapLabel }: CallerCardProps) => {
  const composedUrl = useComposedCard(card);
  const showName = nameGoesBelow(useCardLabels()) || !composedUrl;
  const content = (
    <>
      <img src={composedUrl ?? card.image} alt={card.title} className="caller__card-image" />
      {showName && <span className="caller__card-name">{card.title}</span>}
    </>
  );

  if (!onTap) return <div className="caller__card">{content}</div>;
  return (
    <button type="button" className="caller__card caller__card--tappable" onClick={onTap} aria-label={`${card.title}. ${tapLabel}`}>
      {content}
    </button>
  );
};

/** Compone por adelantado la carta que sigue, sin mostrarla, para que salga al instante. */
export const CallerCardPreload = ({ card }: { card: Card }) => {
  useComposedCard(card);
  return null;
};
