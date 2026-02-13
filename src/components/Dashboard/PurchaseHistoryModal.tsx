import { useTranslation } from 'react-i18next';
import { FaTimes } from 'react-icons/fa';
import type { TokenPurchase } from '../../repositories/TokenPricingRepository';
import './PurchaseHistoryModal.css';

interface PurchaseHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchases: TokenPurchase[];
  isLoading: boolean;
}

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatAmount = (cents: number) => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2
  }).format(cents / 100);
};

const formatProvider = (provider: string) => {
  if (provider === 'mercadopago') return 'Mercado Pago';
  return provider;
};

const formatStatus = (status: string | null, t: (key: string) => string) => {
  if (!status) return '—';
  if (status === 'approved') return t('dashboard.purchaseHistory.statusApproved');
  if (status === 'pending') return t('dashboard.purchaseHistory.statusPending');
  if (status === 'rejected') return t('dashboard.purchaseHistory.statusRejected');
  return status;
};

export const PurchaseHistoryModal = ({ isOpen, onClose, purchases, isLoading }: PurchaseHistoryModalProps) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div
      className="purchase-history-modal__overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="purchase-history-title"
    >
      <div className="purchase-history-modal__content">
        <div className="purchase-history-modal__header">
          <h2 id="purchase-history-title" className="purchase-history-modal__title">
            {t('dashboard.purchaseHistory.title')}
          </h2>
          <button
            type="button"
            className="purchase-history-modal__close"
            onClick={onClose}
            aria-label={t('common.close')}
          >
            <FaTimes />
          </button>
        </div>

        <div className="purchase-history-modal__body">
          {isLoading ? (
            <div className="purchase-history-modal__loading">
              <div className="purchase-history-modal__spinner" />
              <span>{t('common.loading')}</span>
            </div>
          ) : purchases.length === 0 ? (
            <p className="purchase-history-modal__empty">{t('dashboard.purchaseHistory.empty')}</p>
          ) : (
            <div className="purchase-history-modal__table-wrapper">
              <table className="purchase-history-modal__table">
                <thead>
                  <tr>
                    <th>{t('dashboard.purchaseHistory.colDate')}</th>
                    <th>{t('dashboard.purchaseHistory.colPlan')}</th>
                    <th>{t('dashboard.purchaseHistory.colTokens')}</th>
                    <th>{t('dashboard.purchaseHistory.colAmount')}</th>
                    <th>{t('dashboard.purchaseHistory.colMethod')}</th>
                    <th>{t('dashboard.purchaseHistory.colStatus')}</th>
                  </tr>
                </thead>
                <tbody>
                  {purchases.map((p) => (
                    <tr key={p.id} className="purchase-history-modal__row">
                      <td className="purchase-history-modal__cell-date" data-label={t('dashboard.purchaseHistory.colDate')}>
                        {formatDate(p.created_at)}
                      </td>
                      <td data-label={t('dashboard.purchaseHistory.colPlan')}>
                        {p.bonus_tokens > 0
                          ? t('dashboard.purchaseHistory.planTokens', { base: p.base_tokens, bonus: p.bonus_tokens })
                          : t('dashboard.purchaseHistory.planCustom', { count: p.base_tokens })}
                      </td>
                      <td className="purchase-history-modal__cell-tokens" data-label={t('dashboard.purchaseHistory.colTokens')}>
                        {p.total_tokens}
                      </td>
                      <td className="purchase-history-modal__cell-amount" data-label={t('dashboard.purchaseHistory.colAmount')}>
                        {formatAmount(p.amount_cents)}
                      </td>
                      <td data-label={t('dashboard.purchaseHistory.colMethod')}>
                        {formatProvider(p.payment_provider)}
                      </td>
                      <td data-label={t('dashboard.purchaseHistory.colStatus')}>
                        {formatStatus(p.payment_status, t)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
