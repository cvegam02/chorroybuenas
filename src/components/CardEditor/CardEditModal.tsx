import { createPortal } from 'react-dom';
import { CardUpload } from './CardUpload';
import './CardUploadModal.css'; // Reuse same styles

interface CardEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCardUpdate: (image: string, title: string) => Promise<boolean>;
    existingTitles: string[];
    initialTitle: string;
    initialImage: string;
}

export const CardEditModal = ({
    isOpen,
    onClose,
    onCardUpdate,
    existingTitles,
    initialTitle,
    initialImage
}: CardEditModalProps) => {
    if (!isOpen) return null;

    const handleCardUpdate = async (image: string, title: string) => {
        const wasUpdated = await onCardUpdate(image, title);
        if (wasUpdated) {
            onClose();
        }
        return wasUpdated;
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
                <div className="card-upload-modal__header">
                    <h2 className="card-upload-modal__title">Editar Carta</h2>
                    <button
                        className="card-upload-modal__close"
                        onClick={onClose}
                        aria-label="Cerrar"
                    >
                        ×
                    </button>
                </div>
                <CardUpload
                    onCardAdd={handleCardUpdate}
                    existingTitles={existingTitles}
                    initialTitle={initialTitle}
                    initialImage={initialImage}
                    submitLabel="Guardar Cambios"
                />
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
};
