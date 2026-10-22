import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { logger } from '../../utils/logger';

interface TraditionalTransferBannerProps {
  boardCount: number;
  onSave: () => Promise<void>;
  onDiscard: () => void;
}

/** «¿Guardar estos N tableros en tu cuenta?» (FEAT-53, decisión 18): lo armado sin sesión, al entrar con sesión. */
export const TraditionalTransferBanner = ({ boardCount, onSave, onDiscard }: TraditionalTransferBannerProps) => {
  const { t } = useTranslation();
  const [isSaving, setIsSaving] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);

  const save = async () => {
    setIsSaving(true);
    setHasFailed(false);
    try {
      await onSave();
    } catch (error) {
      logger.error('[TraditionalTransferBanner] No se pudieron pasar los tableros a la cuenta:', error);
      setHasFailed(true);
      setIsSaving(false);
    }
  };

  return (
    <div className="traditional-transfer" role="region" aria-labelledby="traditional-transfer-title">
      <p id="traditional-transfer-title" className="traditional-transfer__title">
        {t('traditional.transfer.title', { count: boardCount })}
      </p>
      <p className="traditional-transfer__text">{t('traditional.transfer.text')}</p>
      {hasFailed && (
        <p className="traditional-transfer__error" role="alert">
          {t('traditional.transfer.error')}
        </p>
      )}
      <div className="traditional-transfer__actions">
        <button type="button" className="traditional-boards__primary" onClick={save} disabled={isSaving}>
          {isSaving ? t('common.loading') : t('traditional.transfer.save')}
        </button>
        <button type="button" className="traditional-boards__secondary" onClick={onDiscard} disabled={isSaving}>
          {t('traditional.transfer.discard')}
        </button>
      </div>
    </div>
  );
};
