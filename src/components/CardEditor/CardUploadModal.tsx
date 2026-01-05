import { createPortal } from 'react-dom';
import { CardUpload } from './CardUpload';
import './CardUploadModal.css';

interface CardUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCardAdd: (image: string, title: string) => Promise<void>;
}

export const CardUploadModal = ({ isOpen, onClose, onCardAdd }: CardUploadModalProps) => {
  if (!isOpen) return null;

  const handleCardAdd = async (image: string, title: string) => {
    await onCardAdd(image, title);
    onClose();
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
        <CardUpload onCardAdd={handleCardAdd} />
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

