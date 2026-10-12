import { useTranslation } from 'react-i18next';
import { FaGift, FaRegCreditCard } from 'react-icons/fa';
import { latestTokenMovements, type TokenHistoryEntry, type TokenMovement } from '../../utils/tokenHistory';
import './TokenMovements.css';

interface TokenMovementsProps {
  /** Tokens recibidos y usados desde que existe la cuenta; null mientras cargan. */
  received: number | null;
  spent: number | null;
  /** El historial completo; de aquí salen los últimos movimientos. */
  history: readonly TokenHistoryEntry[];
  isHistoryLoading: boolean;
  onViewAll: () => void;
}

const MINUS = '−';

/** Con signo para que se lea si entró o salió; el cero va solo. */
const signed = (amount: number): string => {
  if (amount === 0) return '0';
  return amount > 0 ? `+${amount}` : `${MINUS}${Math.abs(amount)}`;
};

const tokensOf = (movement: TokenMovement): number =>
  movement.kind === 'gift' ? movement.gift.amount : movement.purchase.total_tokens;

/** «Movimientos de tokens» de Mi cuenta: lo recibido, lo usado y los últimos movimientos. */
export const TokenMovements = ({ received, spent, history, isHistoryLoading, onViewAll }: TokenMovementsProps) => {
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.startsWith('en') ? 'en-US' : 'es-MX';
  const dateFormat = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' });
  const moneyFormat = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 });
  const movements = latestTokenMovements(history);

  const renderList = () => {
    if (isHistoryLoading) {
      return (
        <div className="dashboard__loading-inline" role="status">
          <div className="dashboard__spinner dashboard__spinner--small" />
          <span>{t('common.loading')}</span>
        </div>
      );
    }
    if (movements.length === 0) {
      return <p className="token-movements__empty">{t('dashboard.movements.empty')}</p>;
    }
    return (
      <ul className="token-movements__list">
        {movements.map((movement) => {
          const isGift = movement.kind === 'gift';
          const date = dateFormat.format(new Date(movement.created_at));
          const amount = tokensOf(movement);
          return (
            <li key={`${movement.kind}-${movement.id}`} className="token-movements__row">
              <span className="token-movements__icon" aria-hidden="true">
                {isGift ? <FaGift /> : <FaRegCreditCard />}
              </span>
              <div className="token-movements__text">
                <span className="token-movements__name">
                  {t(isGift ? 'dashboard.movements.gift' : 'dashboard.movements.purchase')}
                </span>
                <span className="token-movements__detail">
                  {isGift ? date : `${date} · ${moneyFormat.format(movement.purchase.amount_cents / 100)}`}
                </span>
              </div>
              <strong className={`token-movements__amount ${amount < 0 ? 'token-movements__amount--out' : ''}`}>
                {signed(amount)}
              </strong>
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <section className="token-movements" aria-labelledby="token-movements-title">
      <div className="dashboard__column-header">
        <h2 className="dashboard__column-title" id="token-movements-title">
          {t('dashboard.movements.title')}
        </h2>
        <button type="button" className="dashboard__column-link token-movements__view-all--top" onClick={onViewAll}>
          {t('dashboard.movements.viewAll')} <span aria-hidden="true">→</span>
        </button>
      </div>
      <div className="token-movements__card">
        <div className="token-movements__summary">
          <div className="token-movements__total token-movements__total--in">
            <span className="token-movements__total-label">{t('dashboard.movements.received')}</span>
            <strong className="token-movements__total-value">{received === null ? '—' : signed(received)}</strong>
          </div>
          <div className="token-movements__total token-movements__total--out">
            <span className="token-movements__total-label">{t('dashboard.movements.spent')}</span>
            <strong className="token-movements__total-value">{spent === null ? '—' : signed(-spent)}</strong>
          </div>
        </div>
        {renderList()}
        <button type="button" className="dashboard__column-link token-movements__view-all--bottom" onClick={onViewAll}>
          {t('dashboard.movements.viewAllLong')}
        </button>
      </div>
    </section>
  );
};
