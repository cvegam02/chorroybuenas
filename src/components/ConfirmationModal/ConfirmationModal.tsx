import './ConfirmationModal.css';

interface ConfirmationModalProps {
  onComplete: () => void;
  onModify: () => void;
}

export const ConfirmationModal = ({ onComplete, onModify }: ConfirmationModalProps) => {
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
          ¡Tu archivo PDF ha sido descargado exitosamente!
        </h2>
        <p className="confirmation-modal__message">
          ¿Estás listo para salir? Una vez que salgas, todos los datos generados se eliminarán.
        </p>
        <div className="confirmation-modal__actions">
          <button
            onClick={onModify}
            className="confirmation-modal__modify-button"
          >
            Modificar
          </button>
          <button
            onClick={onComplete}
            className="confirmation-modal__complete-button"
          >
            Completo
          </button>
        </div>
      </div>
    </div>
  );
};

