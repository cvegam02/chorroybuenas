import { useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { FaTimes } from 'react-icons/fa';
import { CardUpload } from './CardUpload';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import { usePageScrollLock } from '../../hooks/usePageScrollLock';
import { useVisualViewportFit } from '../../hooks/useVisualViewportFit';
import { nextCardNumber } from '../../utils/uploadQueue';
import './CardUploadModal.css';

interface CardUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCardAdd: (image: string, title: string) => Promise<boolean>;
  existingTitles: string[];
}

export const CardUploadModal = ({ isOpen, onClose, onCardAdd, existingTitles }: CardUploadModalProps) => {
  const { t } = useTranslation();
  const overlayRef = useRef<HTMLDivElement>(null);
  useEscapeKey(onClose, isOpen);
  usePageScrollLock(isOpen);
  useVisualViewportFit(overlayRef, isOpen);
  if (!isOpen) return null;

  const handleCardAdd = async (image: string, title: string) => {
    const wasAdded = await onCardAdd(image, title);
    if (wasAdded) {
      onClose();
    }
    return wasAdded;
  };

  const modalContent = (
    <div
      ref={overlayRef}
      className="card-modal__overlay card-modal__overlay--sheet"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="card-modal__content" role="dialog" aria-modal="true" aria-labelledby="card-upload-modal-title">
        <div className="card-modal__header">
          <h2 id="card-upload-modal-title" className="card-modal__title">{t('modals.cardUpload.title')}</h2>
          <button type="button" className="card-modal__close" onClick={onClose} aria-label={t('common.close')}>
            <FaTimes aria-hidden="true" />
          </button>
        </div>
        <div className="card-modal__body card-modal__body--fill">
          <CardUpload
            onCardAdd={handleCardAdd}
            existingTitles={existingTitles}
            previewNumber={nextCardNumber(existingTitles.length)}
          />
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
