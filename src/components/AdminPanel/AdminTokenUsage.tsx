import { useCallback, useEffect, useState } from 'react';

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const fn = () => setIsMobile(mq.matches);
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, []);
  return isMobile;
};
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { AdminRepository, type AdminTokenUsageWithInfo } from '../../repositories/AdminRepository';
import { TokenPricingRepository } from '../../repositories/TokenPricingRepository';
import { AIService } from '../../services/AIService';
import './AdminTokenUsage.css';

const PAGE_SIZE = 20;
const COST_PER_TOKEN_USD = AIService.COST_PER_IMAGE;
const CHART_COLOR = '#c41e3a';

interface TokenUsageFilters {
  email: string;
  dateFrom: string;
  dateTo: string;
  setName: string;
}

const INITIAL_FILTERS: TokenUsageFilters = {
  email: '',
  dateFrom: '',
  dateTo: '',
  setName: '',
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

const formatShortDate = (dayStr: string) => {
  const d = new Date(dayStr);
  return d.toLocaleDateString('es-MX', { month: 'short', day: 'numeric' });
};

const formatUsd = (usd: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(usd);

const formatPesos = (cents: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 }).format(cents / 100);

const formatReason = (reason: string | null) => {
  if (!reason) return '—';
  if (reason === 'ai_conversion') return 'Conversión IA';
  return reason;
};

export const AdminTokenUsage = () => {
  const isMobile = useIsMobile();
  const [usage, setUsage] = useState<AdminTokenUsageWithInfo[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<TokenUsageFilters>(INITIAL_FILTERS);
  const [filterInputs, setFilterInputs] = useState<TokenUsageFilters>(INITIAL_FILTERS);

  const [summary, setSummary] = useState<{
    totalTokens: number;
    uniqueUsers: number;
    uniqueSets: number;
  } | null>(null);
  const [usageByDay, setUsageByDay] = useState<{ day: string; tokens: number }[]>([]);
  const [usageByUser, setUsageByUser] = useState<{ user_id: string; email: string | null; total_tokens: number }[]>([]);
  const [usageBySet, setUsageBySet] = useState<{ set_id: string; set_name: string | null; total_tokens: number }[]>([]);
  const [exchangeRateMxnUsd, setExchangeRateMxnUsd] = useState<number | null>(null);

  const filterParams = filters.dateFrom || filters.dateTo ? { dateFrom: filters.dateFrom, dateTo: filters.dateTo } : undefined;

  const load = useCallback(async () => {
    setIsLoading(true);
    const hasFilters = filters.email || filters.dateFrom || filters.dateTo || filters.setName;
    const tableFilterParams = hasFilters ? filters : undefined;

    const daysForChart = isMobile ? 14 : 30;
    const topLimit = isMobile ? 5 : 8;

    const [
      usageData,
      count,
      summaryData,
      byDay,
      byUser,
      bySet,
      mxnRate,
    ] = await Promise.all([
      AdminRepository.getTokenUsageWithInfo(PAGE_SIZE, page * PAGE_SIZE, tableFilterParams),
      AdminRepository.getTokenUsageCount(tableFilterParams),
      AdminRepository.getUsageSummary(filterParams),
      AdminRepository.getUsageByDay(daysForChart, filterParams),
      AdminRepository.getUsageByUser(topLimit, filterParams),
      AdminRepository.getUsageBySet(topLimit, filterParams),
      TokenPricingRepository.getExchangeRateMxnUsd(),
    ]);

    setUsage(usageData);
    setTotal(count);
    setSummary(summaryData);
    setUsageByDay(byDay);
    setUsageByUser(byUser);
    setUsageBySet(bySet);
    setExchangeRateMxnUsd(mxnRate);
    setIsLoading(false);
  }, [page, filters, isMobile]);

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
  const tokensInPage = usage.reduce((s, u) => s + u.amount, 0);

  const costUsd = summary ? summary.totalTokens * COST_PER_TOKEN_USD : null;
  const costMxn =
    costUsd != null && exchangeRateMxnUsd != null && exchangeRateMxnUsd > 0
      ? costUsd / exchangeRateMxnUsd
      : null;

  const chartData = usageByDay.map((r) => ({
    ...r,
    label: formatShortDate(r.day),
  }));

  return (
    <div className="admin-token-usage">
      <div className="admin-token-usage__header">
        <h2 className="admin-token-usage__title">Estadísticas de uso de IA</h2>
        <p className="admin-token-usage__subtitle">
          Imágenes transformadas, costes y métricas por período
          {filterParams && ' (filtrado)'}
        </p>
      </div>

      <div className="admin-token-usage__filters">
        <div className="admin-token-usage__filter-row">
          <input
            type="text"
            placeholder="Buscar por email..."
            className="admin-token-usage__filter-input"
            value={filterInputs.email}
            onChange={(e) => setFilterInputs((f) => ({ ...f, email: e.target.value }))}
            onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
          />
          <input
            type="text"
            placeholder="Buscar por lotería..."
            className="admin-token-usage__filter-input"
            value={filterInputs.setName}
            onChange={(e) => setFilterInputs((f) => ({ ...f, setName: e.target.value }))}
            onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
          />
          <input
            type="date"
            className="admin-token-usage__filter-input admin-token-usage__filter-input--date"
            value={filterInputs.dateFrom}
            onChange={(e) => setFilterInputs((f) => ({ ...f, dateFrom: e.target.value }))}
          />
          <input
            type="date"
            className="admin-token-usage__filter-input admin-token-usage__filter-input--date"
            value={filterInputs.dateTo}
            onChange={(e) => setFilterInputs((f) => ({ ...f, dateTo: e.target.value }))}
          />
          <button type="button" className="admin-token-usage__filter-btn" onClick={applyFilters}>
            Filtrar
          </button>
          <button
            type="button"
            className="admin-token-usage__filter-btn admin-token-usage__filter-btn--secondary"
            onClick={clearFilters}
          >
            Limpiar
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="admin-token-usage__loading">
          <div className="admin-token-usage__spinner" />
          <span>Cargando estadísticas...</span>
        </div>
      ) : (
        <>
          {/* Tarjetas de resumen */}
          <div className="admin-token-usage__summary">
            <div className="admin-token-usage__card admin-token-usage__card--images">
              <span className="admin-token-usage__card-label">Imágenes transformadas</span>
              <span className="admin-token-usage__card-value">
                {(summary?.totalTokens ?? 0).toLocaleString()}
              </span>
              <span className="admin-token-usage__card-detail">1 token = 1 imagen</span>
            </div>
            <div className="admin-token-usage__card admin-token-usage__card--cost">
              <span className="admin-token-usage__card-label">Costo estimado (USD)</span>
              <span className="admin-token-usage__card-value">
                {costUsd != null ? formatUsd(costUsd) : '—'}
              </span>
              <span className="admin-token-usage__card-detail">
                {COST_PER_TOKEN_USD} USD/imagen
              </span>
            </div>
            <div className="admin-token-usage__card admin-token-usage__card--mxn">
              <span className="admin-token-usage__card-label">Costo estimado (MXN)</span>
              <span className="admin-token-usage__card-value">
                {costMxn != null ? formatPesos(Math.round(costMxn * 100)) : '—'}
              </span>
            </div>
            <div className="admin-token-usage__card admin-token-usage__card--users">
              <span className="admin-token-usage__card-label">Usuarios activos</span>
              <span className="admin-token-usage__card-value">
                {(summary?.uniqueUsers ?? 0).toLocaleString()}
              </span>
            </div>
            <div className="admin-token-usage__card admin-token-usage__card--sets">
              <span className="admin-token-usage__card-label">Loterías usadas</span>
              <span className="admin-token-usage__card-value">
                {(summary?.uniqueSets ?? 0).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Gráficas */}
          <div className="admin-token-usage__charts">
            {chartData.length > 0 && (
              <div className="admin-token-usage__chart-box">
                <h3 className="admin-token-usage__chart-title">
                  Tokens por día {isMobile ? '(últimos 14 días)' : '(últimos 30 días)'}
                </h3>
                <div className="admin-token-usage__chart-scroll">
                  <div
                    className="admin-token-usage__chart admin-token-usage__chart--daily"
                    style={{ minWidth: Math.max(320, chartData.length * (isMobile ? 22 : 28)) }}
                  >
                    <BarChart
                      data={chartData}
                      width={Math.max(320, chartData.length * (isMobile ? 22 : 28))}
                      height={isMobile ? 180 : 220}
                      margin={{ top: 8, right: 8, left: 0, bottom: 8 }}
                    >
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: isMobile ? 9 : 11 }}
                        interval={isMobile && chartData.length > 7 ? Math.max(0, Math.floor(chartData.length / 5) - 1) : 0}
                      />
                      <YAxis tick={{ fontSize: isMobile ? 9 : 11 }} allowDecimals={false} width={28} />
                      <Tooltip
                        formatter={(value: number) => [value.toLocaleString(), 'Tokens']}
                        labelFormatter={(l) => chartData.find((d) => d.label === l)?.day ?? l}
                        contentStyle={{ fontSize: '13px', padding: '8px 12px' }}
                      />
                      <Bar dataKey="tokens" radius={[4, 4, 0, 0]} barSize={isMobile ? 14 : 24}>
                        {chartData.map((_, i) => (
                          <Cell key={i} fill={CHART_COLOR} fillOpacity={0.85} />
                        ))}
                      </Bar>
                    </BarChart>
                  </div>
                </div>
              </div>
            )}

            <div className="admin-token-usage__chart-row">
              {usageByUser.length > 0 && (
                <div className="admin-token-usage__chart-box admin-token-usage__chart-box--half">
                  <h3 className="admin-token-usage__chart-title">Top usuarios (tokens)</h3>
                  <div className="admin-token-usage__chart admin-token-usage__chart--small">
                    <ResponsiveContainer width="100%" height={isMobile ? 160 : 200}>
                      <BarChart
                        data={usageByUser.map((u) => ({
                          name: (u.email || u.user_id.slice(0, 8) + '…').slice(0, isMobile ? 18 : 30),
                          tokens: u.total_tokens,
                        }))}
                        layout="vertical"
                        margin={{ top: 4, right: 8, left: 4, bottom: 4 }}
                      >
                        <XAxis type="number" tick={{ fontSize: isMobile ? 9 : 10 }} allowDecimals={false} />
                        <YAxis type="category" dataKey="name" width={isMobile ? 80 : 100} tick={{ fontSize: isMobile ? 9 : 10 }} />
                        <Tooltip formatter={(v: number) => [v.toLocaleString(), 'Tokens']} contentStyle={{ fontSize: '12px', padding: '6px 10px' }} />
                        <Bar dataKey="tokens" fill={CHART_COLOR} radius={[0, 4, 4, 0]} barSize={isMobile ? 16 : 20} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
              {usageBySet.length > 0 && (
                <div className="admin-token-usage__chart-box admin-token-usage__chart-box--half">
                  <h3 className="admin-token-usage__chart-title">Top loterías (tokens)</h3>
                  <div className="admin-token-usage__chart admin-token-usage__chart--small">
                    <ResponsiveContainer width="100%" height={isMobile ? 160 : 200}>
                      <BarChart
                        data={usageBySet.map((s) => ({
                          name: ((s.set_name || 'Sin nombre').slice(0, isMobile ? 14 : 20)) + (s.set_name && s.set_name.length > (isMobile ? 14 : 20) ? '…' : ''),
                          tokens: s.total_tokens,
                        }))}
                        layout="vertical"
                        margin={{ top: 4, right: 8, left: 4, bottom: 4 }}
                      >
                        <XAxis type="number" tick={{ fontSize: isMobile ? 9 : 10 }} allowDecimals={false} />
                        <YAxis type="category" dataKey="name" width={isMobile ? 80 : 100} tick={{ fontSize: isMobile ? 9 : 10 }} />
                        <Tooltip formatter={(v: number) => [v.toLocaleString(), 'Tokens']} contentStyle={{ fontSize: '12px', padding: '6px 10px' }} />
                        <Bar dataKey="tokens" fill={CHART_COLOR} radius={[0, 4, 4, 0]} barSize={isMobile ? 16 : 20} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Tabla detalle */}
          <div className="admin-token-usage__table-section">
            <h3 className="admin-token-usage__table-title">
              Registro detallado · {total} registro{total !== 1 ? 's' : ''}
              {usage.length > 0 && ` · ${tokensInPage.toLocaleString()} tokens en esta página`}
            </h3>
            {usage.length === 0 ? (
              <p className="admin-token-usage__empty">No hay registros con los filtros aplicados.</p>
            ) : (
              <>
                <div className="admin-token-usage__table-wrapper">
                  <table className="admin-token-usage__table">
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Email</th>
                        <th>Lotería</th>
                        <th>Tokens</th>
                        <th>Razón</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usage.map((u) => (
                        <tr key={u.id} className="admin-token-usage__row">
                          <td className="admin-token-usage__cell-date" data-label="Fecha">
                            {formatDate(u.created_at)}
                          </td>
                          <td className="admin-token-usage__cell-email" data-label="Email" title={u.user_id}>
                            {u.email || '—'}
                          </td>
                          <td className="admin-token-usage__cell-set" data-label="Lotería">
                            {u.set_name || '—'}
                          </td>
                          <td className="admin-token-usage__cell-amount" data-label="Tokens">
                            {u.amount}
                          </td>
                          <td data-label="Razón">{formatReason(u.reason)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {totalPages > 1 && (
                  <div className="admin-token-usage__pagination">
                    <button
                      type="button"
                      className="admin-token-usage__page-btn"
                      disabled={page === 0}
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      aria-label="Página anterior"
                    >
                      <FaChevronLeft />
                    </button>
                    <span className="admin-token-usage__page-info">
                      Página {page + 1} de {totalPages}
                    </span>
                    <button
                      type="button"
                      className="admin-token-usage__page-btn"
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
        </>
      )}
    </div>
  );
};
