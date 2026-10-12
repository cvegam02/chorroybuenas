import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaDownload, FaRegTrashAlt } from 'react-icons/fa';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import { logger } from '../../utils/logger';
import './LoteriaDialogs.css';

interface RenameLoteriaDialogProps {
  currentName: string;
  /** Guarda el nombre nuevo; si lanza, la ventana se queda abierta y avisa. */
  onSave: (name: string) => Promise<void>;
  onClose: () => void;
}

/** Ventana para cambiar el nombre de una lotería desde Mi cuenta. */
export const RenameLoteriaDialog = ({ currentName, onSave, onClose }: RenameLoteriaDialogProps) => {
  const { t } = useTranslation();
  const [value, setValue] = useState(currentName);
  const [isSaving, setIsSaving] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);
  const name = value.trim();

  const closeIfIdle = () => {
    if (!isSaving) onClose();
  };
  useEscapeKey(closeIfIdle);

  const save = async () => {
    if (!name || isSaving) return;
    if (name === currentName) {
      onClose();
      return;
    }
    setIsSaving(true);
    setHasFailed(false);
    try {
      await onSave(name);
    } catch (error) {
      logger.error('Error renaming set:', error);
      setHasFailed(true);
      setIsSaving(false);
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
      <form
        className="loteria-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rename-loteria-title"
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
      >
        <h2 className="loteria-dialog__title" id="rename-loteria-title">
          {t('dashboard.renameLoteria')}
        </h2>
        <label className="loteria-dialog__label">
          {t('setView.renamePlaceholder')}
          <input
            type="text"
            className="loteria-dialog__input"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onFocus={(event) => event.target.select()}
            disabled={isSaving}
            autoFocus
          />
        </label>
        <span className="loteria-dialog__hint">{t('dashboard.loterias.renameHint')}</span>
        {hasFailed && (
          <p className="loteria-dialog__error" role="alert">
            {t('dashboard.nameUpdateError')}
          </p>
        )}
        <div className="loteria-dialog__actions">
          <button type="button" className="loteria-dialog__button" onClick={closeIfIdle} disabled={isSaving}>
            {t('common.cancel')}
          </button>
          <button type="submit" className="loteria-dialog__button loteria-dialog__button--primary" disabled={isSaving || !name}>
            {isSaving ? t('common.loading') : t('common.save')}
          </button>
        </div>
      </form>
    </div>
  );
};

interface DeleteLoteriaDialogProps {
  name: string;
  /** Cuántas cartas se van con ella; null si no se sabe. */
  cardCount: number | null;
  /** La lotería está lista: se ofrece bajar su PDF antes de eliminarla. */
  canDownload: boolean;
  isDownloading: boolean;
  onDownload: () => void;
  /** Elimina la lotería; si lanza, la ventana se queda abierta y avisa. */
  onConfirm: () => Promise<void>;
  onClose: () => void;
}

/** Ventana para confirmar que se elimina una lotería desde Mi cuenta. */
export const DeleteLoteriaDialog = ({
  name,
  cardCount,
  canDownload,
  isDownloading,
  onDownload,
  onConfirm,
  onClose,
}: DeleteLoteriaDialogProps) => {
  const { t } = useTranslation();
  const [isDeleting, setIsDeleting] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);

  const closeIfIdle = () => {
    if (!isDeleting) onClose();
  };
  useEscapeKey(closeIfIdle);

  const confirm = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    setHasFailed(false);
    try {
      await onConfirm();
    } catch (error) {
      logger.error('Error deleting set:', error);
      setHasFailed(true);
      setIsDeleting(false);
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
        aria-labelledby="delete-loteria-title"
        aria-describedby="delete-loteria-text"
      >
        <span className="loteria-dialog__icon" aria-hidden="true">
          <FaRegTrashAlt />
        </span>
        <h2 className="loteria-dialog__title" id="delete-loteria-title">
          {t('dashboard.loterias.deleteTitle', { name })}
        </h2>
        <p className="loteria-dialog__text" id="delete-loteria-text">
          {cardCount !== null && cardCount > 0
            ? t('dashboard.loterias.deleteText', { count: cardCount })
            : t('dashboard.loterias.deleteTextEmpty')}
        </p>
        {canDownload && (
          <div className="loteria-dialog__keep">
            <FaDownload aria-hidden="true" />
            <span>
              {t('dashboard.loterias.deleteKeep')}{' '}
              <button
                type="button"
                className="loteria-dialog__keep-action"
                onClick={onDownload}
                disabled={isDownloading || isDeleting}
              >
                {isDownloading ? t('boardGenerator.status.generatingPDF') : t('dashboard.loterias.deleteKeepAction')}
              </button>
            </span>
          </div>
        )}
        {hasFailed && (
          <p className="loteria-dialog__error" role="alert">
            {t('dashboard.loterias.deleteError')}
          </p>
        )}
        <div className="loteria-dialog__actions">
          <button type="button" className="loteria-dialog__button" onClick={closeIfIdle} disabled={isDeleting} autoFocus>
            {t('common.cancel')}
          </button>
          <button
            type="button"
            className="loteria-dialog__button loteria-dialog__button--danger"
            onClick={confirm}
            disabled={isDeleting || isDownloading}
          >
            {isDeleting ? t('common.loading') : t('modals.deleteLoteria.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
};
