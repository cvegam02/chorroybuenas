import { useTranslation } from 'react-i18next';
import './ConfirmationModal.css';

interface ConfirmationModalProps {
  onComplete: () => void;
  onModify: () => void;
}

export const ConfirmationModal = ({ onComplete, onModify }: ConfirmationModalProps) => {
  const { t } = useTranslation();

  return (
    <div className="confirmation-modal__overlay" onClick={(e) => {
      // Close modal if clicking overlay (but not the modal content)
      if (e.target === e.currentTarget) {
        // Don't close on overlay click - require explicit button choice
      }
    }}>
      <div className="confirmation-modal__content">
        <div className="confirmation-modal__icon">✅</div>
        <h2 className="confirmation-modal__title">
          {t('modals.confirmation.title')}
        </h2>
        <p className="confirmation-modal__message">
          {t('modals.confirmation.message')}
        </p>
        <div className="confirmation-modal__actions">
          <button
            onClick={onModify}
            className="confirmation-modal__modify-button"
          >
            {t('modals.confirmation.modify')}
          </button>
          <button
            onClick={onComplete}
            className="confirmation-modal__complete-button"
          >
            {t('modals.confirmation.complete')}
          </button>
        </div>
      </div>
    </div>
  );
};

