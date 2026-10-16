import { useCallback, useEffect, useMemo, useState } from 'react';
import { AdminRepository, type AdminUserRow, type UsersFilters } from '../../repositories/AdminRepository';
import { pageRange } from '../../utils/adminSales';
import { USERS_PAGE_SIZE, type UserFilter, type UserSort } from '../../utils/adminUsers';
import { AdminUserDetail } from './AdminUserDetail';
import { AdminUsersTable } from './AdminUsersTable';
import './AdminSales.css';

const FILTER_OPTIONS: { id: UserFilter; label: string }[] = [
  { id: '', label: 'Todos' },
  { id: 'new_this_month', label: 'Nuevos este mes' },
  { id: 'buyers', label: 'Han comprado' },
  { id: 'never_bought', label: 'Nunca han comprado' },
];

const SORT_OPTIONS: { id: UserSort; label: string }[] = [
  { id: 'recent', label: 'Más recientes' },
  { id: 'activity', label: 'Última actividad' },
  { id: 'paid', label: 'Más compraron' },
  { id: 'balance', label: 'Mayor saldo' },
];

/** Espera tras la última tecla antes de buscar, para no consultar con cada letra. */
const SEARCH_DELAY_MS = 300;

interface AdminUsersListProps {
  /** Correo con el que llega el buscador escrito, desde «Ver ficha del cliente» en Ventas. */
  initialSearch: string;
  /** Usuario cuya ficha llega abierta, desde «Ver ficha del cliente» en Ventas (US A5). */
  initialUserId: string | null;
  onOpenSales: (email: string, createdAt: string) => void;
}

/** Sub-pestaña «Usuarios» (FEAT-45, US A1): todas las cuentas, con buscador, filtros, orden y páginas de 20. */
export const AdminUsersList = ({ initialSearch, initialUserId, onOpenSales }: AdminUsersListProps) => {
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [search, setSearch] = useState(initialSearch.trim());
  const [filter, setFilter] = useState<UserFilter>('');
  const [sort, setSort] = useState<UserSort>('recent');
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<AdminUserRow[] | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(initialUserId);
  const closeDetail = useCallback(() => setSelectedId(null), []);
  // Tras un regalo cambian el saldo y la última actividad: se recarga la página.
  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(0);
    }, SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const filters = useMemo<UsersFilters>(() => ({ search, filter, sort }), [search, filter, sort]);

  useEffect(() => {
    let current = true;
    setLoading(true);
    setFailed(false);
    Promise.all([
      AdminRepository.getUsers(filters, USERS_PAGE_SIZE, page * USERS_PAGE_SIZE),
      AdminRepository.getUsersCount(filters.search, filters.filter),
    ])
      .then(([pageRows, count]) => {
        if (!current) return;
        if (pageRows && count != null) {
          setRows(pageRows);
          setTotal(count);
        } else {
          setFailed(true);
        }
      })
      .catch(() => {
        if (current) setFailed(true);
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [filters, page, attempt]);

  const lastPage = Math.max(0, Math.ceil(total / USERS_PAGE_SIZE) - 1);

  return (
    <>
      <div className="admin-sales__filters">
        <label className="admin-sales__search">
          <span className="admin-sales__sr-only">Buscar usuario</span>
          <input
            type="search"
            className="admin-sales__field"
            placeholder="Buscar por nombre o correo, entre todas las cuentas…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </label>
        <label className="admin-sales__kind">
          Ordenar
          <select
            className="admin-sales__field"
            value={sort}
            onChange={(e) => {
              setSort(e.target.value as UserSort);
              setPage(0);
            }}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="admin-sales__statuses" role="group" aria-label="Filtro">
        {FILTER_OPTIONS.map((option) => (
          <button
            key={option.id || 'all'}
            type="button"
            className={`admin-sales__chip${filter === option.id ? ' admin-sales__chip--active' : ''}`}
            aria-pressed={filter === option.id}
            onClick={() => {
              setFilter(option.id);
              setPage(0);
            }}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className={`admin-sales__body${selectedId ? ' admin-sales__body--detail' : ''}`}>
        <div className="admin-sales__list">
          {failed ? (
            <div className="admin-sales__error" role="alert">
              <p>No se pudieron cargar los usuarios.</p>
              <button type="button" className="admin-sales__chip" onClick={() => setAttempt((n) => n + 1)}>
                Reintentar
              </button>
            </div>
          ) : loading && !rows ? (
            <p className="admin-sales__empty">Cargando usuarios…</p>
          ) : total === 0 ? (
            <p className="admin-sales__empty">
              {search ? `Nadie coincide con «${search}».` : 'No hay cuentas con este filtro.'}
            </p>
          ) : (
            <section
              aria-label="Lista de usuarios"
              aria-busy={loading}
              className={loading ? 'admin-sales__list--loading' : undefined}
            >
              <AdminUsersTable rows={rows ?? []} selectedId={selectedId} onSelect={(user) => setSelectedId(user.user_id)} />
              <div className="admin-sales__pagination">
                <span className="admin-sales__muted">{pageRange(page, USERS_PAGE_SIZE, total)}</span>
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
        {selectedId && (
          <AdminUserDetail
            userId={selectedId}
            preview={rows?.find((row) => row.user_id === selectedId) ?? null}
            onClose={closeDetail}
            onGifted={reload}
            onOpenSales={onOpenSales}
          />
        )}
      </div>
    </>
  );
};
