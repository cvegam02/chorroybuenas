import { useTranslation } from 'react-i18next';
import { Card } from '../../types';
import { useComposedCard } from '../../hooks/useComposedCard';

interface SetCardThumbProps {
  card: Card;
  /** La imagen ya cargó: mientras no, se muestra el esqueleto. */
  loaded: boolean;
  onLoaded: () => void;
  onOpen: () => void;
}

/** Una carta de la lista de la lotería guardada: como sale impresa; mientras no está lista, la foto con su nombre. */
export const SetCardThumb = ({ card, loaded, onLoaded, onOpen }: SetCardThumbProps) => {
  const { t } = useTranslation();
  const composedUrl = useComposedCard(card);
  const imageUrl = composedUrl ?? card.image;

  return (
    <button type="button" className="set-view__card-thumb set-view__card-thumb--clickable" onClick={onOpen}>
      {imageUrl ? (
        <div className="set-view__card-img-wrapper">
          {!loaded && <div className="set-view__card-skeleton" aria-hidden="true" />}
          <img
            src={imageUrl}
            alt={card.title}
            className="set-view__card-img"
            style={loaded ? undefined : { opacity: 0 }}
            onLoad={onLoaded}
          />
        </div>
      ) : (
        <div className="set-view__card-placeholder">{t('setView.noImage')}</div>
      )}
      {!composedUrl && <span className="set-view__card-title">{card.title}</span>}
    </button>
  );
};
