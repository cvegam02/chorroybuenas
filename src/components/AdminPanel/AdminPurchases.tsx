import { useCallback, useEffect, useState } from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { AdminRepository, type AdminPurchase } from '../../repositories/AdminRepository';
import './AdminPurchases.css';

const PAGE_SIZE = 20;

export interface PurchaseFilters {
  email: string;
  status: string;
  provider: string;
  dateFrom: string;
  dateTo: string;
}

const INITIAL_FILTERS: PurchaseFilters = {
  email: '',
  status: '',
  provider: '',
  dateFrom: '',
  dateTo: '',
};

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

const formatStatus = (status: string | null) => {
  if (!status) return '—';
  if (status === 'approved') return 'Aprobado';
  if (status === 'pending') return 'Pendiente';
  if (status === 'rejected') return 'Rechazado';
  return status;
};

const formatPack = (p: AdminPurchase) => {
  if (p.bonus_tokens > 0) {
    return `${p.base_tokens} + ${p.bonus_tokens} bonus`;
  }
  return `${p.base_tokens} tokens`;
};

export const AdminPurchases = () => {
  const [purchases, setPurchases] = useState<AdminPurchase[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<PurchaseFilters>(INITIAL_FILTERS);
  const [filterInputs, setFilterInputs] = useState<PurchaseFilters>(INITIAL_FILTERS);

  const load = useCallback(async () => {
    setIsLoading(true);
    const filterParams = filters.email || filters.status || filters.provider || filters.dateFrom || filters.dateTo
      ? filters
      : undefined;
    const [data, count] = await Promise.all([
      AdminRepository.getAllPurchases(PAGE_SIZE, page * PAGE_SIZE, filterParams),
      AdminRepository.getPurchasesCount(filterParams),
    ]);
    setPurchases(data);
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

  return (
    <div className="admin-purchases">
      <div className="admin-purchases__header">
        <h2 className="admin-purchases__title">Historial de compras</h2>
        <p className="admin-purchases__subtitle">
          {total} compra{total !== 1 ? 's' : ''} en total
        </p>
      </div>

      <div className="admin-purchases__filters">
        <div className="admin-purchases__filter-row">
          <input
            type="text"
            placeholder="Buscar por email..."
            className="admin-purchases__filter-input"
            value={filterInputs.email}
            onChange={(e) => setFilterInputs((f) => ({ ...f, email: e.target.value }))}
            onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
          />
          <select
            className="admin-purchases__filter-select"
            value={filterInputs.status}
            onChange={(e) => setFilterInputs((f) => ({ ...f, status: e.target.value }))}
          >
            <option value="">Todos los estados</option>
            <option value="approved">Aprobado</option>
            <option value="pending">Pendiente</option>
            <option value="rejected">Rechazado</option>
          </select>
          <select
            className="admin-purchases__filter-select"
            value={filterInputs.provider}
            onChange={(e) => setFilterInputs((f) => ({ ...f, provider: e.target.value }))}
          >
            <option value="">Todos los proveedores</option>
            <option value="mercadopago">Mercado Pago</option>
            <option value="paypal">PayPal</option>
          </select>
          <input
            type="date"
            className="admin-purchases__filter-input admin-purchases__filter-input--date"
            placeholder="Desde"
            value={filterInputs.dateFrom}
            onChange={(e) => setFilterInputs((f) => ({ ...f, dateFrom: e.target.value }))}
          />
          <input
            type="date"
            className="admin-purchases__filter-input admin-purchases__filter-input--date"
            placeholder="Hasta"
            value={filterInputs.dateTo}
            onChange={(e) => setFilterInputs((f) => ({ ...f, dateTo: e.target.value }))}
          />
          <button type="button" className="admin-purchases__filter-btn" onClick={applyFilters}>
            Filtrar
          </button>
          <button type="button" className="admin-purchases__filter-btn admin-purchases__filter-btn--secondary" onClick={clearFilters}>
            Limpiar
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="admin-purchases__loading">
          <div className="admin-purchases__spinner" />
          <span>Cargando compras...</span>
        </div>
      ) : purchases.length === 0 ? (
        <p className="admin-purchases__empty">No hay compras registradas.</p>
      ) : (
        <>
          <div className="admin-purchases__table-wrapper">
            <table className="admin-purchases__table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Email</th>
                  <th>Pack</th>
                  <th>Tokens</th>
                  <th>Monto</th>
                  <th>Proveedor</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((p) => (
                  <tr key={p.id} className="admin-purchases__row">
                    <td className="admin-purchases__cell-date" data-label="Fecha">
                      {formatDate(p.created_at)}
                    </td>
                    <td className="admin-purchases__cell-email" data-label="Email" title={p.user_id}>
                      {p.email || '—'}
                    </td>
                    <td data-label="Pack">{formatPack(p)}</td>
                    <td className="admin-purchases__cell-tokens" data-label="Tokens">
                      {p.total_tokens}
                    </td>
                    <td className="admin-purchases__cell-amount" data-label="Monto">
                      {formatAmount(p.amount_cents)}
                    </td>
                    <td data-label="Proveedor">{formatProvider(p.payment_provider)}</td>
                    <td data-label="Estado">{formatStatus(p.payment_status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="admin-purchases__pagination">
              <button
                type="button"
                className="admin-purchases__page-btn"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                aria-label="Página anterior"
              >
                <FaChevronLeft />
              </button>
              <span className="admin-purchases__page-info">
                Página {page + 1} de {totalPages}
              </span>
              <button
                type="button"
                className="admin-purchases__page-btn"
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
    </div>
  );
};
