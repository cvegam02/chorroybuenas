import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { FaChevronLeft, FaChevronRight, FaTimes } from 'react-icons/fa';
import { Card } from '../../types';
import { useComposedCard } from '../../hooks/useComposedCard';
import './CardPreviewModal.css';

/** Para pasar de una carta a otra sin cerrar la ventana. */
export interface CardPreviewNavigation {
  /** Lugar de la carta en la lista, empezando en 0. */
  index: number;
  total: number;
  onChange: (index: number) => void;
}

interface CardPreviewModalProps {
  card: Card | null;
  isOpen: boolean;
  onClose: () => void;
  /** Carta que ya trae su nombre dibujado (lotería temática): se muestra tal cual, sin componer. */
  finishedCard?: boolean;
  /** Con ella salen las flechas y «9 de 24»; sin ella, la ventana muestra solo la carta. */
  navigation?: CardPreviewNavigation;
  /** Con ella sale el botón «Editar esta carta». */
  onEdit?: () => void;
}

export const CardPreviewModal = ({
  card,
  isOpen,
  onClose,
  finishedCard = false,
  navigation,
  onEdit,
}: CardPreviewModalProps) => {
  const { t } = useTranslation();
  // La carta como sale impresa, con el nombre dentro; mientras no está lista se ve la foto con su nombre.
  const composedUrl = useComposedCard(card, isOpen && !finishedCard);

  const index = navigation?.index;
  const total = navigation?.total;
  const onChangeIndex = navigation?.onChange;
  const hasPrevious = index !== undefined && index > 0;
  const hasNext = index !== undefined && total !== undefined && index < total - 1;

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (index === undefined || !onChangeIndex) return;
      if (e.key === 'ArrowLeft' && hasPrevious) onChangeIndex(index - 1);
      if (e.key === 'ArrowRight' && hasNext) onChangeIndex(index + 1);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose, index, onChangeIndex, hasPrevious, hasNext]);

  if (!isOpen || !card) return null;
  const shownImage = composedUrl ?? card.image;
  // Mientras la carta no se ve como sale impresa (o no tiene imagen) va en un marco, con su nombre debajo
  const isFramed = !composedUrl || !shownImage;

  const modalContent = (
    // Se cierra al tocar fuera: la carta y los botones detienen el toque para que no llegue aquí
    <div className="card-preview-modal__overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label={card.title}>
      <button
        type="button"
        className="card-preview-modal__close"
        onClick={onClose}
        aria-label={t('common.close')}
      >
        <FaTimes aria-hidden="true" />
      </button>

      <div className="card-preview-modal__row">
        {navigation && (
          <button
            type="button"
            className="card-preview-modal__arrow"
            onClick={(e) => {
              e.stopPropagation();
              navigation.onChange(navigation.index - 1);
            }}
            disabled={!hasPrevious}
            aria-label={t('setView.previousCard')}
          >
            <FaChevronLeft aria-hidden="true" />
          </button>
        )}

        <div
          className={`card-preview-modal__card ${isFramed ? 'card-preview-modal__card--framed' : ''}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="card-preview-modal__image-wrap">
            {shownImage ? (
              <img
                src={shownImage}
                alt={card.title}
                className="card-preview-modal__image"
              />
            ) : (
              <div className="card-preview-modal__placeholder">
                {t('setView.noImage')}
              </div>
            )}
          </div>
          {!composedUrl && <div className="card-preview-modal__title">{card.title}</div>}
        </div>

        {navigation && (
          <button
            type="button"
            className="card-preview-modal__arrow"
            onClick={(e) => {
              e.stopPropagation();
              navigation.onChange(navigation.index + 1);
            }}
            disabled={!hasNext}
            aria-label={t('setView.nextCard')}
          >
            <FaChevronRight aria-hidden="true" />
          </button>
        )}
      </div>

      {navigation && (
        <span className="card-preview-modal__position" aria-live="polite">
          {t('setView.cardPosition', { current: navigation.index + 1, total: navigation.total })}
        </span>
      )}

      {onEdit && (
        <button
          type="button"
          className="card-preview-modal__edit"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
        >
          {t('setView.editThisCard')}
        </button>
      )}
    </div>
  );

  return createPortal(modalContent, document.body);
};
