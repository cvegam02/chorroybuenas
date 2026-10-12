import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../../types';
import { useComposedCard } from '../../hooks/useComposedCard';

interface SetCardThumbProps {
  card: Card;
  onOpen: () => void;
}

/** Una carta de la lista de la lotería guardada: como sale impresa; mientras no está lista, la foto con su nombre. */
export const SetCardThumb = ({ card, onOpen }: SetCardThumbProps) => {
  const { t } = useTranslation();
  const composedUrl = useComposedCard(card);
  const imageUrl = composedUrl ?? card.image;
  // La imagen ya cargó: mientras no, se muestra el esqueleto
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <button type="button" className="set-cards__card" onClick={onOpen}>
      {imageUrl ? (
        <span className="set-cards__image-wrap">
          {!isLoaded && <span className="set-cards__skeleton" aria-hidden="true" />}
          <img
            src={imageUrl}
            alt={card.title}
            className="set-cards__image"
            style={isLoaded ? undefined : { opacity: 0 }}
            onLoad={() => setIsLoaded(true)}
          />
        </span>
      ) : (
        <span className="set-cards__placeholder">{t('setView.noImage')}</span>
      )}
      {card.isAiGenerated && <span className="set-cards__ai">{t('setView.aiBadge')}</span>}
      {!composedUrl && <span className="set-cards__name">{card.title}</span>}
    </button>
  );
};
