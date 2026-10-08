import { useEffect, useState } from 'react';
import { FaGift } from 'react-icons/fa';
import {
  AdminRepository,
  type AdminTokenGift,
  type AdminUserBalanceWithInfo,
} from '../../repositories/AdminRepository';
import { TokenPricingRepository } from '../../repositories/TokenPricingRepository';
import { AIService } from '../../services/AIService';
import type { RevenueSummary } from '../../utils/adminRevenue';
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

const GIFT_REASON_MAX_LENGTH = 200;

const formatPerson = (name: string | null, email: string | null) => name || email || '—';

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
  const [revenue, setRevenue] = useState<RevenueSummary | null>(null);
  const [totalTokensUsed, setTotalTokensUsed] = useState<number | null>(null);
  const [exchangeRateMxnUsd, setExchangeRateMxnUsd] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [gifts, setGifts] = useState<AdminTokenGift[] | null>([]);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const [balancesData, purchasesSummary, usageSummary, mxnUsdRate, giftsData] = await Promise.all([
        AdminRepository.getBalancesWithUserInfo(200),
        AdminRepository.getPurchasesSummary(),
        AdminRepository.getTokenUsageSummary(),
        TokenPricingRepository.getExchangeRateMxnUsd(),
        AdminRepository.getTokenGifts(),
      ]);
      setBalances(balancesData);
      setRevenue(purchasesSummary);
      setTotalTokensUsed(usageSummary);
      setExchangeRateMxnUsd(mxnUsdRate);
      setGifts(giftsData);
      setIsLoading(false);
    };
    load();
  }, []);

  const [giftTarget, setGiftTarget] = useState<AdminUserBalanceWithInfo | null>(null);
  const [giftAmount, setGiftAmount] = useState('10');
  const [giftReason, setGiftReason] = useState('');
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
    const newBalance = await AdminRepository.giftTokens(giftTarget.user_id, amount, giftReason);
    setIsGifting(false);
    if (newBalance != null) {
      setBalances((prev) =>
        prev.map((b) =>
          b.user_id === giftTarget.user_id ? { ...b, balance: newBalance } : b
        )
      );
      setGiftTarget(null);
      setGiftAmount('10');
      setGiftReason('');
      setGifts(await AdminRepository.getTokenGifts());
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
        <div className="admin-stat-card admin-stat-card--green">
          <span className="admin-stat-card__label">Ingresos totales</span>
          <span className="admin-stat-card__value">
            {revenue ? formatPesos(revenue.totalCents) : '—'}
          </span>
          {revenue && (
            <>
              <span className="admin-stat-card__detail">
                Tokens: {formatPesos(revenue.tokensCents)} · Temáticas: {formatPesos(revenue.seasonalCents)}
              </span>
              <span className="admin-stat-card__detail">
                {revenue.totalCount} compra{revenue.totalCount !== 1 ? 's' : ''}
              </span>
            </>
          )}
        </div>
        <div className="admin-stat-card admin-stat-card--primary">
          <span className="admin-stat-card__label">Tokens gastados (IA)</span>
          <span className="admin-stat-card__value">
            {totalTokensUsed != null ? totalTokensUsed.toLocaleString() : '—'}
          </span>
          <span className="admin-stat-card__detail">&nbsp;</span>
        </div>
        <div className="admin-stat-card admin-stat-card--blue">
          <span className="admin-stat-card__label">Costo estimado IA (MXN)</span>
          <span className="admin-stat-card__value">
            {estimatedCostMxn != null ? formatPesos(Math.round(estimatedCostMxn * 100)) : '—'}
          </span>
          <span className="admin-stat-card__detail">
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
                          setGiftReason('');
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

      <div className="admin-balances__table-section">
        <h3 className="admin-balances__table-title">Historial de regalos</h3>
        {gifts === null ? (
          <p className="admin-balances__empty">No se pudo cargar el historial de regalos.</p>
        ) : gifts.length === 0 ? (
          <p className="admin-balances__empty">Todavía no se ha regalado ningún token.</p>
        ) : (
          <div className="admin-balances__table-wrapper">
            <table className="admin-balances__table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Regaló</th>
                  <th>Para</th>
                  <th>Tokens</th>
                  <th>Motivo</th>
                </tr>
              </thead>
              <tbody>
                {gifts.map((g) => (
                  <tr key={g.id} className="admin-balances__row">
                    <td className="admin-balances__cell-date" data-label="Fecha">
                      {formatDate(g.created_at)}
                    </td>
                    <td data-label="Regaló" title={g.admin_email ?? undefined}>
                      {formatPerson(g.admin_name, g.admin_email)}
                    </td>
                    <td className="admin-balances__cell-name" data-label="Para" title={g.recipient_email ?? undefined}>
                      {formatPerson(g.recipient_name, g.recipient_email)}
                    </td>
                    <td className="admin-balances__cell-balance" data-label="Tokens">
                      {g.amount}
                    </td>
                    <td data-label="Motivo">{g.reason || '—'}</td>
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
              <label htmlFor="admin-gift-amount">Cantidad de tokens</label>
              <input
                id="admin-gift-amount"
                type="number"
                min={1}
                value={giftAmount}
                onChange={(e) => setGiftAmount(e.target.value)}
              />
            </div>
            <div className="admin-balances__gift-field">
              <label htmlFor="admin-gift-reason">Motivo (opcional)</label>
              <input
                id="admin-gift-reason"
                type="text"
                maxLength={GIFT_REASON_MAX_LENGTH}
                placeholder="Por ejemplo: compensación por un error"
                value={giftReason}
                onChange={(e) => setGiftReason(e.target.value)}
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
