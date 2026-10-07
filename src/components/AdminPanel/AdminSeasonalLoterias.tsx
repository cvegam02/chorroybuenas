import { useCallback, useEffect, useState } from 'react';
import { FaPencilAlt, FaPlus } from 'react-icons/fa';
import {
  SeasonalRepository,
  type AdminSeasonalLoteria,
  type Season,
} from '../../repositories/SeasonalRepository';
import { formatFileSize } from '../../utils/seasonalLoteria';
import { AdminSeasonalLoteriaForm } from './AdminSeasonalLoteriaForm';
import './AdminTokenPacks.css';
import './AdminPurchases.css';
import './AdminSeasonal.css';

interface AdminSeasonalLoteriasProps {
  seasons: readonly Season[];
  /** Se llama cuando cambia el número de loterías de alguna temporada. */
  onChanged: () => void;
}

/** 'new' mientras se crea una lotería; la lotería mientras se edita; null con la ventana cerrada. */
type FormTarget = 'new' | AdminSeasonalLoteria | null;

const PRICE_FORMAT = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

export const AdminSeasonalLoterias = ({ seasons, onChanged }: AdminSeasonalLoteriasProps) => {
  const [loterias, setLoterias] = useState<AdminSeasonalLoteria[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [formTarget, setFormTarget] = useState<FormTarget>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    const data = await SeasonalRepository.getAdminLoterias();
    setLoadFailed(data === null);
    setLoterias(data ?? []);
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

  const seasonName = (seasonId: string) => seasons.find((s) => s.id === seasonId)?.name_es ?? '—';
  const hasSeasons = seasons.length > 0;

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
              <th>PDF</th>
              <th>Ventas</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loterias.map((loteria) => (
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
                  <span
                    className={`admin-packs__badge admin-packs__badge--${loteria.is_published ? 'active' : 'inactive'}`}
                  >
                    {loteria.is_published ? 'Publicada' : 'Borrador'}
                  </span>
                </td>
                <td data-label="PDF">{loteria.pdf ? formatFileSize(loteria.pdf.sizeBytes) : 'Sin PDF'}</td>
                {/* Las ventas se cuentan a partir de la historia C1 (compras). */}
                <td data-label="Ventas">0</td>
                <td data-label="Acciones">
                  <button
                    type="button"
                    className="admin-packs__action-btn"
                    onClick={() => setFormTarget(loteria)}
                    title="Editar"
                    aria-label={`Editar ${loteria.name_es}`}
                  >
                    <FaPencilAlt />
                  </button>
                </td>
              </tr>
            ))}
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

      {renderLoterias()}

      {formTarget && (
        <AdminSeasonalLoteriaForm
          seasons={seasons}
          loteria={formTarget === 'new' ? null : formTarget}
          onClose={handleFormClose}
        />
      )}
    </section>
  );
};
