import { useState, type ReactNode } from 'react';
import { useEscapeKey } from '../../hooks/useEscapeKey';
// Misma ventana que las de renombrar y eliminar de Mi cuenta: son sus estilos
import '../Dashboard/LoteriaDialogs.css';
import './SetConfirmDialog.css';

interface SetConfirmDialogProps {
  icon: ReactNode;
  /** «danger» para lo que borra; «primary» para lo demás. */
  tone: 'primary' | 'danger';
  title: string;
  text: string;
  confirmLabel: string;
  cancelLabel: string;
  /** Hace la acción; mientras termina, la ventana no se puede cerrar. */
  onConfirm: () => Promise<void>;
  onClose: () => void;
}

/** Ventana de confirmación de la página de una lotería: revolver y borrar tableros. */
export const SetConfirmDialog = ({
  icon,
  tone,
  title,
  text,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onClose,
}: SetConfirmDialogProps) => {
  const [isBusy, setIsBusy] = useState(false);

  const closeIfIdle = () => {
    if (!isBusy) onClose();
  };
  useEscapeKey(closeIfIdle);

  const confirm = async () => {
    if (isBusy) return;
    setIsBusy(true);
    try {
      await onConfirm();
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div
      className="loteria-dialog__overlay"
      onClick={(event) => {
        if (event.target === event.currentTarget) closeIfIdle();
      }}
      role="presentation"
    >
      <div
        className="loteria-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="set-confirm-title"
        aria-describedby="set-confirm-text"
      >
        <span className={`loteria-dialog__icon ${tone === 'primary' ? 'set-confirm__icon--primary' : ''}`} aria-hidden="true">
          {icon}
        </span>
        <h2 className="loteria-dialog__title" id="set-confirm-title">
          {title}
        </h2>
        <p className="loteria-dialog__text" id="set-confirm-text">
          {text}
        </p>
        <div className="loteria-dialog__actions">
          <button type="button" className="loteria-dialog__button" onClick={closeIfIdle} disabled={isBusy} autoFocus>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`loteria-dialog__button loteria-dialog__button--${tone}`}
            onClick={confirm}
            disabled={isBusy}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
