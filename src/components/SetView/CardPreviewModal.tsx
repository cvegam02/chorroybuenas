import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Card } from '../../types';
import './CardPreviewModal.css';

interface CardPreviewModalProps {
  card: Card | null;
  isOpen: boolean;
  onClose: () => void;
}

export const CardPreviewModal = ({ card, isOpen, onClose }: CardPreviewModalProps) => {
  const { t } = useTranslation();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', onKeyDown);
      return () => window.removeEventListener('keydown', onKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen || !card) return null;

  const modalContent = (
    <div
      className="card-preview-modal__overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="card-preview-modal__content"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="card-preview-modal__close"
          onClick={onClose}
          aria-label={t('common.close')}
        >
          ×
        </button>
        <div className="card-preview-modal__card">
          <div className="card-preview-modal__image-wrap">
            {card.image ? (
              <img
                src={card.image}
                alt={card.title}
                className="card-preview-modal__image"
              />
            ) : (
              <div className="card-preview-modal__placeholder">
                {t('setView.noImage')}
              </div>
            )}
          </div>
          <div className="card-preview-modal__title">{card.title}</div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
