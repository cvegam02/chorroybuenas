import { useEffect, useState } from 'react';
import { FaGift } from 'react-icons/fa';
import { AdminRepository, type AdminUserBalanceWithInfo } from '../../repositories/AdminRepository';
import { TokenPricingRepository } from '../../repositories/TokenPricingRepository';
import { AIService } from '../../services/AIService';
import './AdminBalances.css';

const COST_PER_TOKEN_USD = AIService.COST_PER_IMAGE;

const formatPesos = (cents: number) => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
};

const formatUsd = (usd: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(usd);
};

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const AdminBalances = () => {
  const [balances, setBalances] = useState<AdminUserBalanceWithInfo[]>([]);
  const [totalRevenueCents, setTotalRevenueCents] = useState<number | null>(null);
  const [totalPurchases, setTotalPurchases] = useState<number | null>(null);
  const [totalTokensUsed, setTotalTokensUsed] = useState<number | null>(null);
  const [exchangeRateMxnUsd, setExchangeRateMxnUsd] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const [balancesData, purchasesSummary, usageSummary, purchasesCount, mxnUsdRate] = await Promise.all([
        AdminRepository.getBalancesWithUserInfo(200),
        AdminRepository.getPurchasesSummary(),
        AdminRepository.getTokenUsageSummary(),
        AdminRepository.getPurchasesCount(),
        TokenPricingRepository.getExchangeRateMxnUsd(),
      ]);
      setBalances(balancesData);
      setTotalRevenueCents(purchasesSummary.totalRevenueCents);
      setTotalPurchases(purchasesCount);
      setTotalTokensUsed(usageSummary);
      setExchangeRateMxnUsd(mxnUsdRate);
      setIsLoading(false);
    };
    load();
  }, []);

  const [giftTarget, setGiftTarget] = useState<AdminUserBalanceWithInfo | null>(null);
  const [giftAmount, setGiftAmount] = useState('10');
  const [isGifting, setIsGifting] = useState(false);
  const [giftError, setGiftError] = useState<string | null>(null);

  const handleGift = async () => {
    if (!giftTarget) return;
    const amount = parseInt(giftAmount, 10);
    if (isNaN(amount) || amount < 1) {
      setGiftError('Cantidad inválida');
      return;
    }
    setIsGifting(true);
    setGiftError(null);
    const newBalance = await AdminRepository.giftTokens(giftTarget.user_id, amount);
    setIsGifting(false);
    if (newBalance != null) {
      setBalances((prev) =>
        prev.map((b) =>
          b.user_id === giftTarget.user_id ? { ...b, balance: newBalance } : b
        )
      );
      setGiftTarget(null);
      setGiftAmount('10');
    } else {
      setGiftError('Error al regalar tokens');
    }
  };

  const estimatedCostUsd = totalTokensUsed != null ? totalTokensUsed * COST_PER_TOKEN_USD : null;
  const estimatedCostMxn =
    estimatedCostUsd != null && exchangeRateMxnUsd != null && exchangeRateMxnUsd > 0
      ? estimatedCostUsd / exchangeRateMxnUsd
      : null;

  if (isLoading) {
    return (
      <div className="admin-balances">
        <div className="admin-balances__loading">
          <div className="admin-balances__spinner" />
          <span>Cargando...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-balances">
      <div className="admin-balances__header">
        <h2 className="admin-balances__title">Balances y costos</h2>
        <p className="admin-balances__subtitle">
          Resumen de ingresos, tokens gastados y costos estimados de IA.
        </p>
      </div>

      <div className="admin-balances__summary">
        <div className="admin-balances__card admin-balances__card--revenue">
          <span className="admin-balances__card-label">Ingresos totales</span>
          <span className="admin-balances__card-value">
            {totalRevenueCents != null ? formatPesos(totalRevenueCents) : '—'}
          </span>
          <span className="admin-balances__card-detail">
            {totalPurchases != null ? `${totalPurchases} compra${totalPurchases !== 1 ? 's' : ''}` : ''}
          </span>
        </div>
        <div className="admin-balances__card admin-balances__card--usage">
          <span className="admin-balances__card-label">Tokens gastados (IA)</span>
          <span className="admin-balances__card-value">
            {totalTokensUsed != null ? totalTokensUsed.toLocaleString() : '—'}
          </span>
        </div>
        <div className="admin-balances__card admin-balances__card--cost">
          <span className="admin-balances__card-label">Costo estimado IA (MXN)</span>
          <span className="admin-balances__card-value">
            {estimatedCostMxn != null ? formatPesos(Math.round(estimatedCostMxn * 100)) : '—'}
          </span>
          <span className="admin-balances__card-detail">
            {estimatedCostUsd != null && (
              <>≈ {formatUsd(estimatedCostUsd)} · {COST_PER_TOKEN_USD} USD/imagen</>
            )}
          </span>
        </div>
      </div>

      <div className="admin-balances__table-section">
        <h3 className="admin-balances__table-title">Balances por usuario</h3>
        {balances.length === 0 ? (
          <p className="admin-balances__empty">No hay usuarios con balance.</p>
        ) : (
          <div className="admin-balances__table-wrapper">
            <table className="admin-balances__table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Correo</th>
                  <th>Balance</th>
                  <th>Última actualización</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {balances.map((b) => (
                  <tr key={b.user_id} className="admin-balances__row">
                    <td className="admin-balances__cell-name" data-label="Nombre">
                      {b.full_name || '—'}
                    </td>
                    <td className="admin-balances__cell-email" data-label="Correo" title={b.user_id}>
                      {b.email || '—'}
                    </td>
                    <td className="admin-balances__cell-balance" data-label="Balance">
                      {b.balance}
                    </td>
                    <td className="admin-balances__cell-date" data-label="Última actualización">
                      {formatDate(b.updated_at)}
                    </td>
                    <td className="admin-balances__cell-actions" data-label="Acciones">
                      <button
                        type="button"
                        className="admin-balances__gift-btn"
                        onClick={() => {
                          setGiftTarget(b);
                          setGiftAmount('10');
                          setGiftError(null);
                        }}
                        title="Regalar tokens"
                      >
                        <FaGift /> Regalar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {giftTarget && (
        <div className="admin-balances__gift-overlay" onClick={(e) => e.target === e.currentTarget && setGiftTarget(null)}>
          <div className="admin-balances__gift-modal">
            <h3>Regalar tokens</h3>
            <p className="admin-balances__gift-target">
              A: {giftTarget.full_name || '—'} ({giftTarget.email || giftTarget.user_id})
            </p>
            <div className="admin-balances__gift-field">
              <label>Cantidad de tokens</label>
              <input
                type="number"
                min={1}
                value={giftAmount}
                onChange={(e) => setGiftAmount(e.target.value)}
              />
            </div>
            {giftError && <p className="admin-balances__gift-error">{giftError}</p>}
            <div className="admin-balances__gift-actions">
              <button type="button" className="admin-balances__btn admin-balances__btn--secondary" onClick={() => setGiftTarget(null)}>
                Cancelar
              </button>
              <button type="button" className="admin-balances__btn admin-balances__btn--primary" onClick={handleGift} disabled={isGifting}>
                {isGifting ? 'Regalando…' : 'Regalar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
