import { useCallback, useEffect, useMemo, useState } from 'react';
import { FaDownload } from 'react-icons/fa';
import { AdminRepository, type AdminSaleRow, type SalesFilters } from '../../repositories/AdminRepository';
import {
  pageRange,
  SALES_PAGE_SIZE,
  type SaleKind,
  type SalesTotals,
  type SaleStatusFilter,
} from '../../utils/adminSales';
import { salesCsv, salesCsvFileName } from '../../utils/salesCsv';
import { AdminPeriodPicker, defaultPeriodSelection, type PeriodSelection } from './AdminPeriodPicker';
import { AdminSaleDetail } from './AdminSaleDetail';
import { AdminSalesTable, saleKey } from './AdminSalesTable';
import { AdminSalesTotals } from './AdminSalesTotals';
import './AdminSales.css';

const STATUS_OPTIONS: { id: SaleStatusFilter; label: string }[] = [
  { id: '', label: 'Todas' },
  { id: 'approved', label: 'Aprobadas' },
  { id: 'pending', label: 'Pendientes' },
];

/** Baja un texto como archivo, con el nombre dado. */
const downloadText = (text: string, fileName: string) => {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
};

/** Espera tras la última tecla antes de buscar, para no consultar con cada letra. */
const SEARCH_DELAY_MS = 300;

/** Filtros con los que se abre Ventas desde una tarjeta del Resumen (US A5). */
export interface SalesPreset {
  selection: PeriodSelection;
  kind: '' | SaleKind;
  status: SaleStatusFilter;
}

interface AdminSalesProps {
  /** Nulo al entrar desde el menú: «Este mes», sin filtros. */
  preset: SalesPreset | null;
  /** «Ver ficha del cliente»: por ahora abre Balances con su correo (decisión 13). */
  onOpenClient: (email: string) => void;
}

/** Pestaña Ventas (FEAT-44): junta Compras y Transacciones MP, con el periodo del Resumen. */
export const AdminSales = ({ preset, onOpenClient }: AdminSalesProps) => {
  const [selection, setSelection] = useState<PeriodSelection>(() => preset?.selection ?? defaultPeriodSelection());
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [kind, setKind] = useState<'' | SaleKind>(preset?.kind ?? '');
  const [status, setStatus] = useState<SaleStatusFilter>(preset?.status ?? '');
  const [page, setPage] = useState(0);
  const [totals, setTotals] = useState<SalesTotals | null>(null);
  const [rows, setRows] = useState<AdminSaleRow[] | null>(null);
  const [totalsLoading, setTotalsLoading] = useState(true);
  const [rowsLoading, setRowsLoading] = useState(true);
  const [totalsFailed, setTotalsFailed] = useState(false);
  const [rowsFailed, setRowsFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [selected, setSelected] = useState<AdminSaleRow | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportFailed, setExportFailed] = useState(false);
  const closeDetail = useCallback(() => setSelected(null), []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(0);
    }, SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const filters = useMemo<SalesFilters>(
    () => ({ period: selection.period, search, kind, status }),
    [selection.period, search, kind, status],
  );

  // Los totales no dependen de la página; su número de ventas también sirve para paginar.
  useEffect(() => {
    let current = true;
    setTotalsLoading(true);
    setTotalsFailed(false);
    AdminRepository.getSalesTotals(filters)
      .then((result) => {
        if (!current) return;
        if (result) setTotals(result);
        else setTotalsFailed(true);
      })
      .catch(() => {
        if (current) setTotalsFailed(true);
      })
      .finally(() => {
        if (current) setTotalsLoading(false);
      });
    return () => {
      current = false;
    };
  }, [filters, attempt]);

  useEffect(() => {
    let current = true;
    setRowsLoading(true);
    setRowsFailed(false);
    AdminRepository.getSales(filters, SALES_PAGE_SIZE, page * SALES_PAGE_SIZE)
      .then((result) => {
        if (!current) return;
        if (result) setRows(result);
        else setRowsFailed(true);
      })
      .catch(() => {
        if (current) setRowsFailed(true);
      })
      .finally(() => {
        if (current) setRowsLoading(false);
      });
    return () => {
      current = false;
    };
  }, [filters, page, attempt]);

  const exportCsv = async () => {
    setExporting(true);
    setExportFailed(false);
    try {
      const all = await AdminRepository.getAllSales(filters);
      if (!all) {
        setExportFailed(true);
        return;
      }
      downloadText(salesCsv(all), salesCsvFileName(filters.period));
    } catch {
      setExportFailed(true);
    } finally {
      setExporting(false);
    }
  };

  const changePeriod = (next: PeriodSelection) => {
    setSelection(next);
    setPage(0);
  };

  const failed = totalsFailed || rowsFailed;
  const loading = totalsLoading || rowsLoading;
  const total = totals?.sales ?? 0;
  const lastPage = Math.max(0, Math.ceil(total / SALES_PAGE_SIZE) - 1);

  return (
    <div className="admin-sales">
      <header className="admin-sales__header">
        <div>
          <h2 className="admin-sales__title">Ventas</h2>
          <p className="admin-sales__subtitle">Compras de tokens y loterías temáticas, con su pago en Mercado Pago</p>
        </div>
        <AdminPeriodPicker value={selection} onChange={changePeriod} />
      </header>

      <div className="admin-sales__filters">
        <label className="admin-sales__search">
          <span className="admin-sales__sr-only">Buscar</span>
          <input
            type="search"
            className="admin-sales__field"
            placeholder="Buscar por nombre o correo…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </label>
        <label className="admin-sales__kind">
          Tipo
          <select
            className="admin-sales__field"
            value={kind}
            onChange={(e) => {
              setKind(e.target.value as '' | SaleKind);
              setPage(0);
            }}
          >
            <option value="">Todas</option>
            <option value="tokens">Tokens</option>
            <option value="seasonal">Lotería temática</option>
          </select>
        </label>
        <button
          type="button"
          className="admin-sales__export"
          onClick={exportCsv}
          disabled={exporting || !totals || totals.sales === 0}
        >
          <FaDownload aria-hidden="true" />
          {exporting ? 'Preparando…' : 'Exportar CSV'}
        </button>
      </div>

      {exportFailed && (
        <p className="admin-sales__export-error" role="alert">
          No se pudo preparar el archivo. Inténtalo otra vez.
        </p>
      )}

      <div className="admin-sales__statuses" role="group" aria-label="Estado">
        {STATUS_OPTIONS.map((option) => (
          <button
            key={option.id || 'all'}
            type="button"
            className={`admin-sales__chip${status === option.id ? ' admin-sales__chip--active' : ''}`}
            aria-pressed={status === option.id}
            onClick={() => {
              setStatus(option.id);
              setPage(0);
            }}
          >
            {option.label}
          </button>
        ))}
      </div>

      {!failed && <AdminSalesTotals totals={totalsLoading ? null : totals} />}

      <div className={`admin-sales__body${selected ? ' admin-sales__body--detail' : ''}`}>
        <div className="admin-sales__list">
          {failed ? (
            <div className="admin-sales__error" role="alert">
              <p>No se pudieron cargar las ventas.</p>
              <button type="button" className="admin-sales__chip" onClick={() => setAttempt((n) => n + 1)}>
                Reintentar
              </button>
            </div>
          ) : loading && (!totals || !rows) ? (
            <p className="admin-sales__empty">Cargando ventas…</p>
          ) : total === 0 ? (
            <p className="admin-sales__empty">No hay ventas con estos filtros.</p>
          ) : (
            <section aria-label="Lista de ventas" aria-busy={loading} className={loading ? 'admin-sales__list--loading' : undefined}>
              <AdminSalesTable
                rows={rows ?? []}
                selectedKey={selected && saleKey(selected)}
                onSelect={setSelected}
              />
              <div className="admin-sales__pagination">
                <span className="admin-sales__muted">{pageRange(page, SALES_PAGE_SIZE, total)}</span>
                <div className="admin-sales__pages">
                  <button type="button" className="admin-sales__chip" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                    ← Anterior
                  </button>
                  <button type="button" className="admin-sales__chip" disabled={page >= lastPage} onClick={() => setPage((p) => p + 1)}>
                    Siguiente →
                  </button>
                </div>
              </div>
            </section>
          )}
        </div>
        {selected && <AdminSaleDetail sale={selected} onClose={closeDetail} onOpenClient={onOpenClient} />}
      </div>
    </div>
  );
};
