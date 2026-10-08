import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SeasonalRepository } from '../../repositories/SeasonalRepository';
import { openDownloadLink } from '../../utils/openDownloadLink';
import './SeasonalDownloadButton.css';

interface SeasonalDownloadButtonProps {
  loteriaId: string;
  /** Nombre de la lotería, para que el botón se distinga en una lista al usar lector de pantalla. */
  loteriaName: string;
}

/** Descarga el PDF de una lotería de temporada comprada: pide un enlace temporal y lo abre. */
export const SeasonalDownloadButton = ({ loteriaId, loteriaName }: SeasonalDownloadButtonProps) => {
  const { t } = useTranslation();
  const [isPreparing, setIsPreparing] = useState(false);
  const [failed, setFailed] = useState(false);

  const handleDownload = async () => {
    setFailed(false);
    setIsPreparing(true);
    const url = await SeasonalRepository.getPdfDownloadUrl(loteriaId);
    setIsPreparing(false);
    if (!url) {
      setFailed(true);
      return;
    }
    openDownloadLink(url);
  };

  return (
    <div className="seasonal-download">
      {failed && (
        <p className="seasonal-download__error" role="alert">
          {t('seasonal.download.error')}
        </p>
      )}
      <button
        type="button"
        className="seasonal-catalog__button seasonal-download__button"
        onClick={handleDownload}
        disabled={isPreparing}
        aria-label={t(failed ? 'seasonal.download.retryLabel' : 'seasonal.download.label', { name: loteriaName })}
      >
        {isPreparing ? t('seasonal.download.preparing') : failed ? t('seasonal.retry') : t('seasonal.download.button')}
      </button>
    </div>
  );
};
