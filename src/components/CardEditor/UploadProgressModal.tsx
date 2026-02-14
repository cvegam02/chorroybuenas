import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { FaCloudUploadAlt } from 'react-icons/fa';
import './UploadProgressModal.css';

interface UploadProgressModalProps {
  isOpen: boolean;
  progress: number; // 0-100, or -1 for indeterminate
}

export const UploadProgressModal = ({ isOpen, progress }: UploadProgressModalProps) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  const isIndeterminate = progress < 0;

  const modalContent = (
    <div className="upload-progress-modal__overlay" role="dialog" aria-modal="true" aria-labelledby="upload-progress-title">
      <div className="upload-progress-modal__content">
        <FaCloudUploadAlt className="upload-progress-modal__icon" />
        <h2 id="upload-progress-title" className="upload-progress-modal__title">
          {t('common.uploadingImages')}
        </h2>
        <div className="upload-progress-modal__bar-wrap">
          <div
            className={`upload-progress-modal__bar ${isIndeterminate ? 'upload-progress-modal__bar--indeterminate' : ''}`}
            style={!isIndeterminate ? { width: `${Math.min(100, Math.max(0, progress))}%` } : undefined}
          />
        </div>
        {!isIndeterminate && (
          <p className="upload-progress-modal__percent">{Math.round(progress)}%</p>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
