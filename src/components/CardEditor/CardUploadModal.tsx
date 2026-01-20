import { createPortal } from 'react-dom';
import { CardUpload } from './CardUpload';
import './CardUploadModal.css';

interface CardUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCardAdd: (image: string, title: string) => Promise<boolean>;
  existingTitles: string[];
}

export const CardUploadModal = ({ isOpen, onClose, onCardAdd, existingTitles }: CardUploadModalProps) => {
  if (!isOpen) return null;

  const handleCardAdd = async (image: string, title: string) => {
    const wasAdded = await onCardAdd(image, title);
    if (wasAdded) {
      onClose();
    }
  };

  const modalContent = (
    <div 
      className="card-upload-modal__overlay" 
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="card-upload-modal__content">
        <button 
          className="card-upload-modal__close"
          onClick={onClose}
          aria-label="Cerrar"
        >
          ×
        </button>
        <h2 className="card-upload-modal__title">Agregar Nueva Carta</h2>
        <CardUpload onCardAdd={handleCardAdd} existingTitles={existingTitles} />
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

