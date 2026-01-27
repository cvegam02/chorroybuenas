import { FaExclamationTriangle } from 'react-icons/fa';
import './WarningModal.css';

interface WarningModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    confirmText?: string;
    cancelText?: string;
    type?: 'warning' | 'danger';
}

export const WarningModal = ({
    isOpen,
    title,
    message,
    onConfirm,
    onCancel,
    confirmText = 'Aceptar',
    cancelText = 'Cancelar',
    type = 'warning'
}: WarningModalProps) => {
    if (!isOpen) return null;

    return (
        <div className="warning-modal__overlay" onClick={(e) => {
            if (e.target === e.currentTarget) onCancel();
        }}>
            <div className={`warning-modal__content warning-modal__content--${type}`}>
                <div className="warning-modal__icon">
                    <FaExclamationTriangle />
                </div>
                <h2 className="warning-modal__title">{title}</h2>
                <p className="warning-modal__message">{message}</p>
                <div className="warning-modal__actions">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="warning-modal__cancel-button"
                    >
                        {cancelText}
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        className="warning-modal__confirm-button"
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};
