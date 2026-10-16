import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaPlus } from 'react-icons/fa';
import {
  SeasonalRepository,
  type AdminSeason,
  type AdminSeasonalLoteria,
  type AdminSeasonalSales,
} from '../../repositories/SeasonalRepository';
import { seasonalOverviewLine, themeChips } from '../../utils/adminSeasonal';
import { summaryPeriod } from '../../utils/adminSummary';
import { openDownloadLink } from '../../utils/openDownloadLink';
import { WarningModal } from '../ConfirmationModal/WarningModal';
import { AdminSeasonalCard } from './AdminSeasonalCard';
import { AdminSeasonalThemes } from './AdminSeasonalThemes';
import './AdminTokenPacks.css';
import './AdminSales.css';
import './AdminPricing.css';
import './AdminSeasonal.css';
import './AdminSeasonalOverview.css';

interface SeasonalData {
  seasons: AdminSeason[];
  loterias: AdminSeasonalLoteria[];
  sales: Map<string, AdminSeasonalSales>;
}

type LoadState = { status: 'loading' } | { status: 'failed' } | ({ status: 'ready' } & SeasonalData);

/** A1.7 — Temáticas (FEAT-48, US A1): loterías en tarjetas, filtro por temática y «Administrar temáticas». */
export const AdminSeasonal = () => {
  const [load, setLoad] = useState<LoadState>({ status: 'loading' });
  const [filter, setFilter] = useState('');
  const [themesOpen, setThemesOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminSeasonalLoteria | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const month = summaryPeriod('month');
    const [seasons, loterias, sales] = await Promise.all([
      SeasonalRepository.getAdminSeasons(),
      SeasonalRepository.getAdminLoterias(),
      SeasonalRepository.getAdminSalesOverview(month.from, month.to),
    ]);
    // Sin las ventas no se sabe cuáles se pueden borrar: se trata como fallo de carga.
    if (!seasons || !loterias || !sales) {
      setLoad({ status: 'failed' });
      return;
    }
    setLoad({ status: 'ready', seasons, loterias, sales });
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const navigate = useNavigate();

  const retry = () => {
    setLoad({ status: 'loading' });
    reload();
  };

  // Cualquier lotería, publicada o no, se abre en el asistente (FEAT-48, US A5).
  const edit = (loteria: AdminSeasonalLoteria) => navigate(`/admin/tematicas/${loteria.id}`);

  const withBusy = async (loteria: AdminSeasonalLoteria, action: () => Promise<string | null>) => {
    setBusyId(loteria.id);
    setActionError(null);
    const failure = await action();
    if (failure) setActionError(failure);
    await reload();
    setBusyId(null);
  };

  const togglePublished = (loteria: AdminSeasonalLoteria) =>
    withBusy(loteria, async () =>
      (await SeasonalRepository.setPublished(loteria.id, !loteria.is_published))
        ? null
        : `No se pudo ${loteria.is_published ? 'despublicar' : 'publicar'} «${loteria.name_es}». Intenta de nuevo.`,
    );

  const download = async (loteria: AdminSeasonalLoteria) => {
    setActionError(null);
    setBusyId(loteria.id);
    const url = await SeasonalRepository.getPdfDownloadUrl(loteria.id);
    setBusyId(null);
    if (!url) {
      setActionError(`No se pudo preparar el PDF de «${loteria.name_es}». Intenta de nuevo.`);
      return;
    }
    openDownloadLink(url);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    await withBusy(target, async () =>
      (await SeasonalRepository.deleteLoteria(target)) ? null : `No se pudo borrar «${target.name_es}». Intenta de nuevo.`,
    );
  };

  const ready = load.status === 'ready' ? load : null;
  const now = new Date();
  const monthRevenue = ready ? [...ready.sales.values()].reduce((sum, sale) => sum + sale.periodRevenueCents, 0) : 0;
  const hasSeasons = (ready?.seasons.length ?? 0) > 0;

  const renderLoterias = () => {
    if (load.status === 'loading') {
      return (
        <div className="admin-packs__loading">
          <div className="admin-packs__spinner" />
          <span>Cargando loterías…</span>
        </div>
      );
    }
    if (load.status === 'failed') {
      return (
        <div className="admin-seasonal__load-error">
          <p className="admin-packs__error">No se pudieron cargar las loterías temáticas.</p>
          <button type="button" className="admin-pricing__btn" onClick={retry}>
            Reintentar
          </button>
        </div>
      );
    }
    if (!hasSeasons) {
      return <p className="admin-pricing__muted">Primero crea una temática en «Administrar temáticas».</p>;
    }
    if (load.loterias.length === 0) {
      return <p className="admin-pricing__muted">Aún no hay loterías temáticas. Crea la primera con «Nueva lotería temática».</p>;
    }
    const shown = filter === '' ? load.loterias : load.loterias.filter((loteria) => loteria.season_id === filter);
    if (shown.length === 0) return <p className="admin-pricing__muted">Esta temática no tiene loterías.</p>;
    const seasonName = (id: string) => load.seasons.find((season) => season.id === id)?.name_es ?? '—';
    return (
      <div className="admin-themes__grid">
        {shown.map((loteria) => (
          <AdminSeasonalCard
            key={loteria.id}
            loteria={loteria}
            seasonName={seasonName(loteria.season_id)}
            sales={load.sales.get(loteria.id)}
            now={now}
            isBusy={busyId === loteria.id}
            onEdit={() => edit(loteria)}
            onTogglePublished={() => togglePublished(loteria)}
            onDownload={() => download(loteria)}
            onDelete={() => setDeleteTarget(loteria)}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="admin-sales">
      <header className="admin-sales__header">
        <div>
          <h2 className="admin-sales__title">Loterías temáticas</h2>
          {ready && <p className="admin-sales__subtitle">{seasonalOverviewLine(ready.loterias, monthRevenue, now)}</p>}
        </div>
        <button
          type="button"
          className="admin-pricing__btn admin-pricing__btn--primary admin-themes__new"
          onClick={() => navigate('/admin/tematicas/nueva')}
          disabled={!hasSeasons}
          title={hasSeasons ? undefined : 'Primero crea una temática'}
        >
          <FaPlus aria-hidden="true" /> Nueva lotería temática
        </button>
      </header>

      {ready && (
        <div className="admin-themes__filters">
          <span className="admin-themes__filters-label">Temática:</span>
          {themeChips(ready.seasons, ready.loterias).map((chip) => (
            <button
              key={chip.id || 'todas'}
              type="button"
              className={`admin-sales__chip${filter === chip.id ? ' admin-sales__chip--active' : ''}`}
              aria-pressed={filter === chip.id}
              onClick={() => setFilter(chip.id)}
            >
              {chip.label} <small>{chip.count}</small>
            </button>
          ))}
          <button
            type="button"
            className="admin-pricing__btn admin-themes__manage"
            aria-expanded={themesOpen}
            onClick={() => setThemesOpen((open) => !open)}
          >
            Administrar temáticas
          </button>
        </div>
      )}

      {ready && themesOpen && <AdminSeasonalThemes seasons={ready.seasons} onChanged={reload} />}

      {actionError && (
        <p className="admin-pricing__error" role="alert">
          {actionError}
        </p>
      )}

      {renderLoterias()}

      <WarningModal
        isOpen={!!deleteTarget}
        title="Borrar lotería"
        message={deleteTarget ? `¿Borrar «${deleteTarget.name_es}»? Se borran también su PDF y sus imágenes.` : ''}
        confirmText="Borrar"
        cancelText="Cancelar"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        type="danger"
      />
    </div>
  );
};
