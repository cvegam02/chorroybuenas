import React, { useCallback, useEffect, useState } from 'react';
import { FaChevronLeft, FaChevronRight, FaExternalLinkAlt } from 'react-icons/fa';
import { AdminRepository, type AdminMPTransaction } from '../../repositories/AdminRepository';
import './AdminMPTransactions.css';

const PAGE_SIZE = 20;

interface MPFilters {
  email: string;
  status: string;
  dateFrom: string;
  dateTo: string;
}

const INITIAL_FILTERS: MPFilters = {
  email: '',
  status: '',
  dateFrom: '',
  dateTo: '',
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const formatAmount = (cents: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 }).format(cents / 100);

const formatStatus = (s: string | null) => {
  if (!s) return '—';
  if (s === 'approved') return 'Aprobado';
  if (s === 'pending') return 'Pendiente';
  if (s === 'rejected') return 'Rechazado';
  return s;
};

const formatPack = (p: AdminMPTransaction) =>
  p.bonus_tokens > 0 ? `${p.base_tokens} + ${p.bonus_tokens} bonus` : `${p.base_tokens} tokens`;

/** Extrae campos útiles del payment_metadata de MP */
const getMPDetailFields = (meta: Record<string, unknown> | null) => {
  if (!meta) return [];
  const payer = meta.payer as Record<string, unknown> | undefined;
  const payerEmail = payer?.email as string | undefined;
  const payerId = payer?.id as string | number | undefined;
  const rows: { label: string; value: string }[] = [];
  if (meta.id != null) rows.push({ label: 'ID MP', value: String(meta.id) });
  if (meta.status != null) rows.push({ label: 'Estado', value: String(meta.status) });
  if (meta.status_detail != null) rows.push({ label: 'Detalle estado', value: String(meta.status_detail) });
  if (meta.date_approved != null) rows.push({ label: 'Fecha aprobación', value: String(meta.date_approved) });
  if (meta.date_created != null) rows.push({ label: 'Fecha creación', value: String(meta.date_created) });
  if (meta.payment_method_id != null) rows.push({ label: 'Método de pago', value: String(meta.payment_method_id) });
  if (meta.payment_type_id != null) rows.push({ label: 'Tipo de pago', value: String(meta.payment_type_id) });
  if (meta.transaction_amount != null)
    rows.push({ label: 'Monto (MP)', value: String(meta.transaction_amount) + ' ' + (meta.currency_id ?? '') });
  if (payerEmail) rows.push({ label: 'Email pagador', value: payerEmail });
  if (payerId != null) rows.push({ label: 'Payer ID', value: String(payerId) });
  return rows;
};

export const AdminMPTransactions = () => {
  const [transactions, setTransactions] = useState<AdminMPTransaction[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<MPFilters>(INITIAL_FILTERS);
  const [filterInputs, setFilterInputs] = useState<MPFilters>(INITIAL_FILTERS);
  const [detailRow, setDetailRow] = useState<AdminMPTransaction | null>(null);
  const [showRawJson, setShowRawJson] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    const hasFilters = filters.email || filters.status || filters.dateFrom || filters.dateTo;
    const filterParams = hasFilters ? filters : undefined;
    const [data, count] = await Promise.all([
      AdminRepository.getMPTransactions(PAGE_SIZE, page * PAGE_SIZE, filterParams),
      AdminRepository.getMPTransactionsCount(filterParams),
    ]);
    setTransactions(data);
    setTotal(count);
    setIsLoading(false);
  }, [page, filters]);

  useEffect(() => {
    load();
  }, [load]);

  const applyFilters = () => {
    setFilters(filterInputs);
    setPage(0);
  };

  const clearFilters = () => {
    setFilterInputs(INITIAL_FILTERS);
    setFilters(INITIAL_FILTERS);
    setPage(0);
  };

  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;
  const detailFields = detailRow ? getMPDetailFields(detailRow.payment_metadata) : [];

  return (
    <div className="admin-mp">
      <div className="admin-mp__header">
        <h2 className="admin-mp__title">Transacciones Mercado Pago</h2>
        <p className="admin-mp__subtitle">
          {total} transacción{total !== 1 ? 'es' : ''} de MP
        </p>
      </div>

      <div className="admin-mp__filters">
        <div className="admin-mp__filter-row">
          <input
            type="text"
            placeholder="Buscar por email..."
            className="admin-mp__filter-input"
            value={filterInputs.email}
            onChange={(e) => setFilterInputs((f) => ({ ...f, email: e.target.value }))}
            onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
          />
          <select
            className="admin-mp__filter-select"
            value={filterInputs.status}
            onChange={(e) => setFilterInputs((f) => ({ ...f, status: e.target.value }))}
          >
            <option value="">Todos los estados</option>
            <option value="approved">Aprobado</option>
            <option value="pending">Pendiente</option>
            <option value="rejected">Rechazado</option>
          </select>
          <input
            type="date"
            className="admin-mp__filter-input admin-mp__filter-input--date"
            value={filterInputs.dateFrom}
            onChange={(e) => setFilterInputs((f) => ({ ...f, dateFrom: e.target.value }))}
          />
          <input
            type="date"
            className="admin-mp__filter-input admin-mp__filter-input--date"
            value={filterInputs.dateTo}
            onChange={(e) => setFilterInputs((f) => ({ ...f, dateTo: e.target.value }))}
          />
          <button type="button" className="admin-mp__filter-btn" onClick={applyFilters}>
            Filtrar
          </button>
          <button
            type="button"
            className="admin-mp__filter-btn admin-mp__filter-btn--secondary"
            onClick={clearFilters}
          >
            Limpiar
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="admin-mp__loading">
          <div className="admin-mp__spinner" />
          <span>Cargando transacciones...</span>
        </div>
      ) : transactions.length === 0 ? (
        <p className="admin-mp__empty">No hay transacciones de Mercado Pago.</p>
      ) : (
        <>
          <div className="admin-mp__table-wrapper">
            <table className="admin-mp__table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Email</th>
                  <th>Pack</th>
                  <th>Tokens</th>
                  <th>Monto</th>
                  <th>Payment ID</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t.id} className="admin-mp__row">
                    <td className="admin-mp__cell-date" data-label="Fecha">
                      {formatDate(t.created_at)}
                    </td>
                    <td className="admin-mp__cell-email" data-label="Email" title={t.user_id}>
                      {t.email || '—'}
                    </td>
                    <td data-label="Pack">{formatPack(t)}</td>
                    <td className="admin-mp__cell-tokens" data-label="Tokens">
                      {t.total_tokens}
                    </td>
                    <td className="admin-mp__cell-amount" data-label="Monto">
                      {formatAmount(t.amount_cents)}
                    </td>
                    <td className="admin-mp__cell-payment-id" data-label="Payment ID">
                      {t.payment_id || '—'}
                    </td>
                    <td data-label="Estado">{formatStatus(t.payment_status)}</td>
                    <td className="admin-mp__cell-actions" data-label="">
                      <button
                        type="button"
                        className="admin-mp__detail-btn"
                        onClick={() => {
                          setDetailRow(t);
                          setShowRawJson(false);
                        }}
                        title="Ver detalle MP"
                      >
                        <FaExternalLinkAlt /> Detalle
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="admin-mp__pagination">
              <button
                type="button"
                className="admin-mp__page-btn"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                aria-label="Página anterior"
              >
                <FaChevronLeft />
              </button>
              <span className="admin-mp__page-info">
                Página {page + 1} de {totalPages}
              </span>
              <button
                type="button"
                className="admin-mp__page-btn"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                aria-label="Página siguiente"
              >
                <FaChevronRight />
              </button>
            </div>
          )}
        </>
      )}

      {detailRow && (
        <div
          className="admin-mp__overlay"
          onClick={(e) => e.target === e.currentTarget && setDetailRow(null)}
        >
          <div className="admin-mp__modal">
            <div className="admin-mp__modal-header">
              <h3>Detalle transacción MP</h3>
              <button
                type="button"
                className="admin-mp__modal-close"
                onClick={() => setDetailRow(null)}
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>
            <div className="admin-mp__modal-body">
              <dl className="admin-mp__detail-list">
                <dt>Compra (internal)</dt>
                <dd>{detailRow.id}</dd>
                <dt>Payment ID (MP)</dt>
                <dd>{detailRow.payment_id || '—'}</dd>
                <dt>Usuario</dt>
                <dd>{detailRow.email || detailRow.user_id}</dd>
                <dt>Monto</dt>
                <dd>{formatAmount(detailRow.amount_cents)}</dd>
                <dt>Estado</dt>
                <dd>{formatStatus(detailRow.payment_status)}</dd>
                {detailFields.map(({ label, value }) => (
                  <React.Fragment key={label}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </React.Fragment>
                ))}
              </dl>
              {detailRow.payment_metadata && (
                <div className="admin-mp__raw-section">
                  <button
                    type="button"
                    className="admin-mp__raw-toggle"
                    onClick={() => setShowRawJson(!showRawJson)}
                  >
                    {showRawJson ? 'Ocultar' : 'Mostrar'} JSON completo
                  </button>
                  {showRawJson && (
                    <pre className="admin-mp__raw-json">
                      {JSON.stringify(detailRow.payment_metadata, null, 2)}
                    </pre>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
