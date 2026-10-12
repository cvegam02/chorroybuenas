import { useEffect, useRef, type MouseEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { CloseIcon } from './AuthIcons';
import './AuthDialog.css';

interface AuthDialogProps {
  /** `id` del título de la vista; es el nombre de la ventana para lectores de pantalla. */
  titleId: string;
  onClose: () => void;
  /** Cambia con cada vista: al cambiar, el foco va al primer campo de la vista nueva. */
  focusKey: string;
  /** En celular ocupa casi toda la pantalla (Crear cuenta). */
  tall?: boolean;
  children: ReactNode;
}

/**
 * Cascarón de las ventanas de cuenta (FEAT-38): velo, caja centrada en escritorio y hoja que sube
 * desde abajo en celular. Cierra con Escape, con la X y al tocar el velo.
 */
export const AuthDialog = ({ titleId, onClose, focusKey, tall = false, children }: AuthDialogProps) => {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      opener?.focus();
    };
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const firstField = dialog.querySelector<HTMLInputElement>('input:not([disabled])');
    (firstField ?? dialog).focus();
  }, [focusKey]);

  const handleVeilClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) onClose();
  };

  return createPortal(
    <div className="auth-dialog" onClick={handleVeilClick}>
      <div
        ref={dialogRef}
        className={`auth-dialog__box${tall ? ' auth-dialog__box--tall' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <span className="auth-dialog__handle" aria-hidden="true" />
        <button type="button" className="auth-dialog__close" onClick={onClose} aria-label={t('common.close')}>
          <CloseIcon />
        </button>
        {children}
      </div>
    </div>,
    document.body,
  );
};
