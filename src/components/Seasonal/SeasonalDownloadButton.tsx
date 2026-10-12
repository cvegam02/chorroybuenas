import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaDownload } from 'react-icons/fa';
import { SeasonalRepository } from '../../repositories/SeasonalRepository';
import { openDownloadLink } from '../../utils/openDownloadLink';
import './SeasonalDownloadButton.css';

interface SeasonalDownloadButtonProps {
  loteriaId: string;
  /** Nombre de la lotería, para que el botón se distinga en una lista al usar lector de pantalla. */
  loteriaName: string;
  /** `large`: el botón principal del detalle de la lotería, a todo el ancho y con ícono. */
  size?: 'default' | 'large';
}

/** Descarga el PDF de una lotería de temporada comprada: pide un enlace temporal y lo abre. */
export const SeasonalDownloadButton = ({ loteriaId, loteriaName, size = 'default' }: SeasonalDownloadButtonProps) => {
  const { t } = useTranslation();
  const [isPreparing, setIsPreparing] = useState(false);
  const [failed, setFailed] = useState(false);
  const isLarge = size === 'large';

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
        className={`seasonal-catalog__button seasonal-download__button ${isLarge ? 'seasonal-download__button--large' : ''}`}
        onClick={handleDownload}
        disabled={isPreparing}
        aria-label={t(failed ? 'seasonal.download.retryLabel' : 'seasonal.download.label', { name: loteriaName })}
      >
        {isLarge && !isPreparing && !failed && <FaDownload aria-hidden="true" />}
        {isPreparing ? t('seasonal.download.preparing') : failed ? t('seasonal.retry') : t('seasonal.download.button')}
      </button>
    </div>
  );
};
