import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FaCheck, FaDownload, FaExclamationCircle, FaLock, FaRegFileAlt, FaSpinner, FaUser } from 'react-icons/fa';
import type { SeasonalBuyState } from '../../utils/seasonalBuyState';
import { SeasonalDownloadButton } from './SeasonalDownloadButton';
import './SeasonalBuyBox.css';

interface SeasonalBuyPanelProps {
  /** `box`: dentro de la caja de compra. `bar`: la barra fija de abajo, solo en celular. */
  variant: 'box' | 'bar';
  state: SeasonalBuyState;
  loteriaId: string;
  loteriaName: string;
  /** Precio ya con formato («$49.00 MXN»), o null si la ficha no lo tiene. */
  price: string | null;
  /** Referencia en dólares ya con formato, solo en inglés. */
  usdReference: string | null;
  isLoggedIn: boolean;
  onBuy: () => void;
  onLogin: () => void;
}

const BUTTON_LABEL: Record<Exclude<SeasonalBuyState, 'owned' | 'pending'>, string> = {
  idle: 'seasonal.detail.buy',
  starting: 'seasonal.detail.buying',
  confirming: 'seasonal.detail.buy',
  failed: 'seasonal.detail.retryBuy',
  cancelled: 'seasonal.detail.retryBuy',
};

const HINT: Partial<Record<SeasonalBuyState, string>> = {
  idle: 'seasonal.detail.payHint',
  starting: 'seasonal.detail.startingHint',
  cancelled: 'seasonal.detail.cancelHint',
};

/** Precio y acción de una lotería temática según el estado de la compra. La lógica vive en `SeasonalDetail`. */
export const SeasonalBuyPanel = ({
  variant,
  state,
  loteriaId,
  loteriaName,
  price,
  usdReference,
  isLoggedIn,
  onBuy,
  onLogin,
}: SeasonalBuyPanelProps) => {
  const { t } = useTranslation();
  const isBar = variant === 'bar';
  const isOffer = state !== 'owned' && state !== 'pending';
  const className = `seasonal-buy seasonal-buy--${variant} seasonal-buy--${state} ${isOffer ? 'seasonal-buy--offer' : ''}`;

  if (state === 'owned') {
    return (
      <div className={className}>
        {!isBar && (
          <span className="seasonal-buy__tag seasonal-buy__tag--owned">
            <FaCheck aria-hidden="true" />
            {t('seasonal.detail.owned')}
          </span>
        )}
        <div className="seasonal-buy__action">
          <SeasonalDownloadButton loteriaId={loteriaId} loteriaName={loteriaName} size="large" />
        </div>
        {!isBar && (
          <p className="seasonal-buy__hint">
            {t('seasonal.detail.ownedHintBefore')}
            <Link to="/dashboard" className="seasonal-buy__link">
              {t('seasonal.detail.myAccount')}
            </Link>
            {t('seasonal.detail.ownedHintAfter')}
          </p>
        )}
      </div>
    );
  }

  if (state === 'pending') {
    return (
      <div className={className}>
        {!isBar && (
          <>
            <span className="seasonal-buy__tag seasonal-buy__tag--pending">{t('seasonal.detail.pendingTag')}</span>
            <p className="seasonal-buy__text">{t('seasonal.detail.pendingText')}</p>
          </>
        )}
        <div className="seasonal-buy__action">
          <Link to="/dashboard" className="seasonal-buy__outline">
            {t('seasonal.detail.toAccount')}
          </Link>
        </div>
      </div>
    );
  }

  const isBusy = state === 'starting' || state === 'confirming';
  const hint = HINT[state];
  const buyButton = (
    <button type="button" className="seasonal-buy__button" onClick={onBuy} disabled={isBusy}>
      {state === 'starting' && <FaSpinner className="seasonal-buy__spinner" aria-hidden="true" />}
      {t(BUTTON_LABEL[state])}
    </button>
  );

  return (
    <div className={className}>
      <div className="seasonal-buy__row">
        {price !== null && (
          <p className="seasonal-buy__price">
            <span className="seasonal-buy__price-label">{t('seasonal.detail.oneTime')}</span>
            <strong className="seasonal-buy__amount">{price}</strong>
            {usdReference !== null && <span className="seasonal-buy__usd">({usdReference})</span>}
          </p>
        )}
        {!isBar && <span className="seasonal-buy__aside">{t('seasonal.detail.noTokens')}</span>}
        {isBar && buyButton}
      </div>

      {!isBar && buyButton}

      {state === 'failed' && (
        <p className="seasonal-buy__error" role="alert">
          <FaExclamationCircle aria-hidden="true" />
          {t('seasonal.detail.buyError')}
        </p>
      )}

      {!isLoggedIn ? (
        <p className="seasonal-buy__hint">
          {t(isBar ? 'seasonal.detail.loginHintShort' : 'seasonal.detail.loginHint')}{' '}
          <button type="button" className="seasonal-buy__link" onClick={onLogin}>
            {t('seasonal.detail.login')}
          </button>
        </p>
      ) : (
        !isBar && hint && <p className="seasonal-buy__hint">{t(hint)}</p>
      )}
    </div>
  );
};

const GUARANTEES = [
  { key: 'payment', Icon: FaLock },
  { key: 'download', Icon: FaDownload },
  { key: 'account', Icon: FaUser },
  { key: 'digital', Icon: FaRegFileAlt },
] as const;

interface SeasonalGuaranteesProps {
  /** Dónde va la lista: dentro de la caja (computadora) o entre las secciones (celular). */
  placement: 'box' | 'flow';
}

/** Las cuatro garantías de la compra de una lotería temática. */
export const SeasonalGuarantees = ({ placement }: SeasonalGuaranteesProps) => {
  const { t } = useTranslation();
  return (
    <ul className={`seasonal-guarantees seasonal-guarantees--${placement}`}>
      {GUARANTEES.map(({ key, Icon }) => (
        <li key={key} className="seasonal-guarantees__item">
          <Icon aria-hidden="true" />
          {t(`seasonal.detail.guarantees.${key}`)}
        </li>
      ))}
    </ul>
  );
};
