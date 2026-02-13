import { FaExclamationTriangle } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
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
    /** Si es true, solo se muestra el botón de confirmar (ej. "Cerrar"). */
    singleButton?: boolean;
}

export const WarningModal = ({
    isOpen,
    title,
    message,
    onConfirm,
    onCancel,
    confirmText,
    cancelText,
    type = 'warning',
    singleButton = false
}: WarningModalProps) => {
    const { t } = useTranslation();

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
                    {!singleButton && (
                        <button
                            type="button"
                            onClick={onCancel}
                            className="warning-modal__cancel-button"
                        >
                            {cancelText || t('modals.warning.cancel')}
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={onConfirm}
                        className="warning-modal__confirm-button"
                    >
                        {confirmText || t('modals.warning.confirm')}
                    </button>
                </div>
            </div>
        </div>
    );
};
