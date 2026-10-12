import { useEffect, useRef, type MouseEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { BackIcon, CloseIcon } from './AuthIcons';
import './AuthDialog.css';

/**
 * Acomodo de la caja: `tall` ocupa casi toda la pantalla en celular (Crear cuenta); `back` deja lugar a la
 * barra de «Volver»; `notice` y `done` van centrados (avisos); `even` lleva el mismo margen en los cuatro lados.
 */
export type AuthDialogVariant = 'default' | 'tall' | 'back' | 'even' | 'notice' | 'done';

interface AuthDialogProps {
  /** `id` del título de la vista; es el nombre de la ventana para lectores de pantalla. */
  titleId: string;
  onClose: () => void;
  /** Cambia con cada vista: al cambiar, el foco va al primer campo de la vista nueva. */
  focusKey: string;
  variant?: AuthDialogVariant;
  /** Con ella, arriba sale «Volver» junto al botón de cerrar. */
  onBack?: () => void;
  /** Sin botón de cerrar («¡Listo! Contraseña guardada»): se sale con el botón de la vista o con Escape. */
  hideClose?: boolean;
  children: ReactNode;
}

/**
 * Cascarón de las ventanas de cuenta (FEAT-38): velo, caja centrada en escritorio y hoja que sube
 * desde abajo en celular. Cierra con Escape, con la X y al tocar el velo.
 */
export const AuthDialog = (props: AuthDialogProps) => {
  const { titleId, onClose, focusKey, variant = 'default', onBack, hideClose = false, children } = props;
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

  const closeButton = (
    <button
      type="button"
      className={`auth-dialog__close${onBack ? ' auth-dialog__close--inline' : ''}`}
      onClick={onClose}
      aria-label={t('common.close')}
    >
      <CloseIcon />
    </button>
  );

  return createPortal(
    <div className="auth-dialog" onClick={handleVeilClick}>
      <div
        ref={dialogRef}
        className={`auth-dialog__box auth-dialog__box--${variant}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <span className="auth-dialog__handle" aria-hidden="true" />
        {onBack ? (
          <div className="auth-dialog__bar">
            <button type="button" className="auth-dialog__back" onClick={onBack}>
              <BackIcon />
              {t('common.back')}
            </button>
            {closeButton}
          </div>
        ) : (
          !hideClose && closeButton
        )}
        {children}
      </div>
    </div>,
    document.body,
  );
};
