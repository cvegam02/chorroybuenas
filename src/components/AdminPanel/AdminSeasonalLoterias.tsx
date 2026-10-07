import { useCallback, useEffect, useState } from 'react';
import { FaPencilAlt, FaPlus, FaTrash } from 'react-icons/fa';
import { SeasonalRepository, type AdminSeasonalLoteria, type Season } from '../../repositories/SeasonalRepository';
import { formatFileSize } from '../../utils/seasonalLoteria';
import type { SeasonalSales } from '../../utils/seasonalPurchase';
import {
  SEASONAL_STATUS_LABELS,
  missingToPublish,
  seasonalStatus,
  type SeasonalStatus,
} from '../../utils/seasonalPublishing';
import { WarningModal } from '../ConfirmationModal/WarningModal';
import { AdminSeasonalLoteriaForm } from './AdminSeasonalLoteriaForm';
import './AdminTokenPacks.css';
import './AdminPurchases.css';
import './AdminSeasonal.css';

interface AdminSeasonalLoteriasProps {
  seasons: readonly Season[];
  /** Se llama cuando cambia el número de loterías de alguna temporada. */
  onChanged: () => void;
}

const HAS_SALES_HINT = 'Tiene ventas: solo se puede despublicar';

/** 'new' mientras se crea una lotería; la lotería mientras se edita; null con la ventana cerrada. */
type FormTarget = 'new' | AdminSeasonalLoteria | null;

const PRICE_FORMAT = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
});
const DATE_FORMAT = new Intl.DateTimeFormat('es-MX', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const STATUS_BADGE_CLASS: Record<SeasonalStatus, string> = {
  draft: 'admin-packs__badge--inactive',
  published: 'admin-packs__badge--active',
  scheduled: 'admin-seasonal__badge--scheduled',
  expired: 'admin-seasonal__badge--expired',
};

function formatDates(loteria: AdminSeasonalLoteria): string {
  const from = loteria.valid_from ? `Desde ${DATE_FORMAT.format(new Date(loteria.valid_from))}` : null;
  const until = loteria.valid_until ? `Hasta ${DATE_FORMAT.format(new Date(loteria.valid_until))}` : null;
  return [from, until].filter(Boolean).join(' · ') || 'Sin fechas';
}

function missingFor(loteria: AdminSeasonalLoteria): string[] {
  return missingToPublish({
    name_es: loteria.name_es,
    description_es: loteria.description_es,
    card_count: loteria.card_count,
    board_count: loteria.board_count,
    price_cents: loteria.price_cents,
    hasPdf: loteria.pdf !== null,
    hasCover: !!loteria.cover_path,
  });
}

export const AdminSeasonalLoterias = ({ seasons, onChanged }: AdminSeasonalLoteriasProps) => {
  const [loterias, setLoterias] = useState<AdminSeasonalLoteria[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [formTarget, setFormTarget] = useState<FormTarget>(null);
  const [seasonFilter, setSeasonFilter] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<AdminSeasonalLoteria | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [sales, setSales] = useState<Map<string, SeasonalSales>>(new Map());

  const load = useCallback(async () => {
    setIsLoading(true);
    const [data, salesData] = await Promise.all([
      SeasonalRepository.getAdminLoterias(),
      SeasonalRepository.getAdminSales(),
    ]);
    // Sin el dato de ventas no se puede saber qué loterías se pueden borrar: se trata como fallo de carga.
    setLoadFailed(data === null || salesData === null);
    setLoterias(data ?? []);
    setSales(salesData ?? new Map());
    setIsLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleFormClose = useCallback(
    (changed: boolean) => {
      setFormTarget(null);
      if (!changed) return;
      load();
      onChanged();
    },
    [load, onChanged],
  );

  const handleTogglePublished = async (loteria: AdminSeasonalLoteria) => {
    setBusyId(loteria.id);
    setActionError(null);
    const saved = await SeasonalRepository.setPublished(loteria.id, !loteria.is_published);
    if (!saved) {
      setActionError(
        `No se pudo ${loteria.is_published ? 'despublicar' : 'publicar'} «${loteria.name_es}». Intenta de nuevo.`,
      );
    }
    await load();
    setBusyId(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    setBusyId(target.id);
    setActionError(null);
    const deleted = await SeasonalRepository.deleteLoteria(target);
    if (!deleted) setActionError(`No se pudo borrar «${target.name_es}». Intenta de nuevo.`);
    await load();
    setBusyId(null);
    if (deleted) onChanged();
  };

  const seasonName = (seasonId: string) => seasons.find((s) => s.id === seasonId)?.name_es ?? '—';
  const hasSeasons = seasons.length > 0;
  const shownLoterias = seasonFilter === '' ? loterias : loterias.filter((l) => l.season_id === seasonFilter);
  const now = new Date();

  const renderLoterias = () => {
    if (isLoading) {
      return (
        <div className="admin-packs__loading">
          <div className="admin-packs__spinner" />
          <span>Cargando loterías...</span>
        </div>
      );
    }
    if (loadFailed) {
      return (
        <div className="admin-seasonal__load-error">
          <p className="admin-packs__error">No se pudieron cargar las loterías.</p>
          <button type="button" className="admin-packs__btn admin-packs__btn--secondary" onClick={load}>
            Reintentar
          </button>
        </div>
      );
    }
    if (loterias.length === 0) {
      return <p className="admin-packs__empty">Aún no hay loterías de temporada.</p>;
    }
    if (shownLoterias.length === 0) {
      return <p className="admin-packs__empty">Esta temporada no tiene loterías.</p>;
    }
    return (
      <div className="admin-purchases__table-wrapper">
        <table className="admin-purchases__table">
          <thead>
            <tr>
              <th>Portada</th>
              <th>Nombre</th>
              <th>Temporada</th>
              <th>Precio</th>
              <th>Estado</th>
              <th>Fechas</th>
              <th>PDF</th>
              <th>Ventas</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {shownLoterias.map((loteria) => {
              const status = seasonalStatus(loteria, now);
              const missing = missingFor(loteria);
              const cannotPublish = !loteria.is_published && missing.length > 0;
              const isBusy = busyId === loteria.id;
              const loteriaSales = sales.get(loteria.id);
              // Cualquier pago registrado (también uno repetido) impide borrarla en la base.
              const hasSales = (loteriaSales?.total ?? 0) > 0;
              return (
                <tr key={loteria.id}>
                  <td data-label="Portada">
                    {loteria.cover_path ? (
                      <img
                        className="admin-seasonal__thumb"
                        src={SeasonalRepository.previewUrl(loteria.cover_path)}
                        alt=""
                        loading="lazy"
                      />
                    ) : (
                      'Sin portada'
                    )}
                  </td>
                  <td data-label="Nombre">{loteria.name_es}</td>
                  <td data-label="Temporada">{seasonName(loteria.season_id)}</td>
                  <td data-label="Precio">
                    {loteria.price_cents === null ? 'Sin precio' : PRICE_FORMAT.format(loteria.price_cents / 100)}
                  </td>
                  <td data-label="Estado">
                    <span className={`admin-packs__badge ${STATUS_BADGE_CLASS[status]}`}>
                      {SEASONAL_STATUS_LABELS[status]}
                    </span>
                  </td>
                  <td data-label="Fechas">{formatDates(loteria)}</td>
                  <td data-label="PDF">{loteria.pdf ? formatFileSize(loteria.pdf.sizeBytes) : 'Sin PDF'}</td>
                  <td data-label="Ventas">{loteriaSales?.approved ?? 0}</td>
                  <td data-label="Acciones">
                    <div className="admin-seasonal__actions">
                      <div className="admin-seasonal__publish">
                        <button
                          type="button"
                          role="switch"
                          className="admin-seasonal__switch"
                          aria-checked={loteria.is_published}
                          aria-label={`Publicada: ${loteria.name_es}`}
                          aria-describedby={cannotPublish ? `seasonal-missing-${loteria.id}` : undefined}
                          title={loteria.is_published ? 'Despublicar' : 'Publicar'}
                          onClick={() => handleTogglePublished(loteria)}
                          disabled={cannotPublish || isBusy}
                        />
                        {cannotPublish && (
                          <span className="admin-seasonal__meta" id={`seasonal-missing-${loteria.id}`}>
                            Falta: {missing.join(', ')}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        className="admin-packs__action-btn"
                        onClick={() => setFormTarget(loteria)}
                        disabled={isBusy}
                        title="Editar"
                        aria-label={`Editar ${loteria.name_es}`}
                      >
                        <FaPencilAlt />
                      </button>
                      <button
                        type="button"
                        className="admin-packs__action-btn"
                        onClick={() => setDeleteTarget(loteria)}
                        disabled={isBusy || hasSales}
                        title={hasSales ? HAS_SALES_HINT : 'Borrar'}
                        aria-label={`Borrar ${loteria.name_es}`}
                        aria-describedby={hasSales ? `seasonal-sales-${loteria.id}` : undefined}
                      >
                        <FaTrash />
                      </button>
                      {hasSales && (
                        <span className="admin-seasonal__meta" id={`seasonal-sales-${loteria.id}`}>
                          {HAS_SALES_HINT}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <section className="admin-seasonal__section">
      <h3 className="admin-seasonal__section-title">Loterías</h3>

      <button
        type="button"
        className="admin-packs__add-btn"
        onClick={() => setFormTarget('new')}
        disabled={!hasSeasons}
        title={hasSeasons ? undefined : 'Primero crea una temporada'}
      >
        <FaPlus /> Nueva lotería
      </button>

      {hasSeasons && (
        <label className="admin-seasonal__filter">
          Temporada
          <select value={seasonFilter} onChange={(e) => setSeasonFilter(e.target.value)}>
            <option value="">Todas</option>
            {seasons.map((season) => (
              <option key={season.id} value={season.id}>
                {season.name_es}
              </option>
            ))}
          </select>
        </label>
      )}

      {actionError && (
        <p className="admin-packs__error" role="alert">
          {actionError}
        </p>
      )}

      {renderLoterias()}

      {formTarget && (
        <AdminSeasonalLoteriaForm
          seasons={seasons}
          loteria={formTarget === 'new' ? null : formTarget}
          hasSales={formTarget !== 'new' && (sales.get(formTarget.id)?.approved ?? 0) > 0}
          onClose={handleFormClose}
        />
      )}

      <WarningModal
        isOpen={!!deleteTarget}
        title="Borrar lotería"
        message={deleteTarget ? `¿Borrar «${deleteTarget.name_es}»? Se borran también su PDF y sus imágenes.` : ''}
        confirmText="Borrar"
        cancelText="Cancelar"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        type="danger"
      />
    </section>
  );
};
