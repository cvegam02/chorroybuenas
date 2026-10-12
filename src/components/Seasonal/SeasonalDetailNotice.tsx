import { useTranslation } from 'react-i18next';
import { FaCheck, FaRegClock, FaRegTimesCircle, FaSpinner, FaTimes } from 'react-icons/fa';
import type { SeasonalReturnNotice } from '../../utils/seasonalBuyState';

interface SeasonalDetailNoticeProps {
  notice: SeasonalReturnNotice | null;
  onClose: () => void;
}

const ICON = {
  confirming: FaSpinner,
  success: FaCheck,
  pending: FaRegClock,
  cancel: FaRegTimesCircle,
} as const;

/** Aviso al volver de Mercado Pago. «Confirmando» no se puede cerrar: se quita solo al terminar. */
export const SeasonalDetailNotice = ({ notice, onClose }: SeasonalDetailNoticeProps) => {
  const { t } = useTranslation();
  if (notice === null) return null;
  const Icon = ICON[notice];
  const isConfirming = notice === 'confirming';

  return (
    <div className={`seasonal-detail__notice seasonal-detail__notice--${notice}`} role="status">
      <Icon className="seasonal-detail__notice-icon" aria-hidden="true" />
      <p>{t(isConfirming ? 'seasonal.detail.confirming' : `seasonal.detail.notice.${notice}`)}</p>
      {!isConfirming && (
        <button
          type="button"
          className="seasonal-detail__notice-close"
          onClick={onClose}
          aria-label={t('seasonal.detail.closeNotice')}
        >
          <FaTimes aria-hidden="true" />
        </button>
      )}
    </div>
  );
};
