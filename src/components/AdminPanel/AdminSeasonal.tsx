import { useCallback, useEffect, useState } from 'react';
import { FaPlus, FaPencilAlt, FaTrash, FaCheck, FaTimes } from 'react-icons/fa';
import {
  SeasonalRepository,
  SEASON_NAME_MAX_LENGTH,
  type AdminSeason,
  type SeasonInput,
} from '../../repositories/SeasonalRepository';
import { WarningModal } from '../ConfirmationModal/WarningModal';
import { AdminSeasonalLoterias } from './AdminSeasonalLoterias';
import './AdminTokenPacks.css';
import './AdminSeasonal.css';

/** 'new' mientras se crea una temporada; el id mientras se edita una; null con el formulario cerrado. */
type FormTarget = 'new' | string | null;

interface SeasonFormState {
  nameEs: string;
  nameEn: string;
  sortOrder: string;
}

const EMPTY_FORM: SeasonFormState = { nameEs: '', nameEn: '', sortOrder: '0' };

function toSeasonInput(form: SeasonFormState): SeasonInput | null {
  const sortOrder = Number(form.sortOrder);
  if (form.nameEs.trim() === '' || !Number.isInteger(sortOrder)) return null;
  return { name_es: form.nameEs, name_en: form.nameEn, sort_order: sortOrder };
}

export const AdminSeasonal = () => {
  const [seasons, setSeasons] = useState<AdminSeason[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [formTarget, setFormTarget] = useState<FormTarget>(null);
  const [form, setForm] = useState<SeasonFormState>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminSeason | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    const data = await SeasonalRepository.getAdminSeasons();
    setLoadFailed(data === null);
    setSeasons(data ?? []);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openNewForm = () => {
    const nextOrder = seasons.reduce((max, s) => Math.max(max, s.sort_order), 0) + (seasons.length > 0 ? 1 : 0);
    setForm({ ...EMPTY_FORM, sortOrder: String(nextOrder) });
    setFormTarget('new');
    setError(null);
  };

  const openEditForm = (season: AdminSeason) => {
    setForm({ nameEs: season.name_es, nameEn: season.name_en ?? '', sortOrder: String(season.sort_order) });
    setFormTarget(season.id);
    setError(null);
  };

  const closeForm = () => {
    setFormTarget(null);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTarget) return;
    const input = toSeasonInput(form);
    if (!input) {
      setError('Escribe el nombre en español y un orden en número entero.');
      return;
    }
    setIsSaving(true);
    setError(null);
    const saved =
      formTarget === 'new'
        ? await SeasonalRepository.createSeason(input)
        : await SeasonalRepository.updateSeason(formTarget, input);
    setIsSaving(false);
    if (!saved) {
      setError('No se pudo guardar la temporada. Intenta de nuevo.');
      return;
    }
    setFormTarget(null);
    await load();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    const deleted = await SeasonalRepository.deleteSeason(target.id);
    if (!deleted) {
      setError(`No se pudo borrar «${target.name_es}». Intenta de nuevo.`);
      return;
    }
    setError(null);
    await load();
  };

  const renderForm = () => (
    <form className="admin-packs__new-form" onSubmit={handleSubmit}>
      <div className="admin-packs__new-row">
        <div className="admin-packs__field admin-seasonal__field--wide">
          <label htmlFor="season-name-es">Nombre en español</label>
          <input
            id="season-name-es"
            type="text"
            maxLength={SEASON_NAME_MAX_LENGTH}
            value={form.nameEs}
            onChange={(e) => setForm((prev) => ({ ...prev, nameEs: e.target.value }))}
            placeholder="Día de Muertos"
            autoFocus
          />
        </div>
        <div className="admin-packs__field admin-seasonal__field--wide">
          <label htmlFor="season-name-en">Nombre en inglés (opcional)</label>
          <input
            id="season-name-en"
            type="text"
            maxLength={SEASON_NAME_MAX_LENGTH}
            value={form.nameEn}
            onChange={(e) => setForm((prev) => ({ ...prev, nameEn: e.target.value }))}
            placeholder="Day of the Dead"
          />
        </div>
        <div className="admin-packs__field">
          <label htmlFor="season-order">Orden</label>
          <input
            id="season-order"
            type="number"
            step={1}
            value={form.sortOrder}
            onChange={(e) => setForm((prev) => ({ ...prev, sortOrder: e.target.value }))}
          />
        </div>
      </div>
      <div className="admin-packs__new-actions">
        <button type="button" className="admin-packs__btn admin-packs__btn--secondary" onClick={closeForm}>
          <FaTimes /> Cancelar
        </button>
        <button type="submit" className="admin-packs__btn admin-packs__btn--primary" disabled={isSaving}>
          <FaCheck /> Guardar
        </button>
      </div>
    </form>
  );

  const renderSeasons = () => {
    if (isLoading) {
      return (
        <div className="admin-packs__loading">
          <div className="admin-packs__spinner" />
          <span>Cargando temporadas...</span>
        </div>
      );
    }
    if (loadFailed) {
      return (
        <div className="admin-seasonal__load-error">
          <p className="admin-packs__error">No se pudieron cargar las temporadas.</p>
          <button type="button" className="admin-packs__btn admin-packs__btn--secondary" onClick={load}>
            Reintentar
          </button>
        </div>
      );
    }
    if (seasons.length === 0) {
      return <p className="admin-packs__empty">Primero crea una temporada.</p>;
    }
    return (
      <div className="admin-packs__list">
        {seasons.map((season) =>
          formTarget === season.id ? (
            <div key={season.id}>{renderForm()}</div>
          ) : (
            <div key={season.id} className="admin-packs__card">
              <div className="admin-packs__card-body">
                <div className="admin-packs__card-main">
                  <span className="admin-packs__card-tokens">{season.name_es}</span>
                  <span className="admin-seasonal__meta">
                    {season.name_en ? `Inglés: ${season.name_en}` : 'Sin nombre en inglés'} · Orden {season.sort_order} ·{' '}
                    {season.loteria_count === 1 ? '1 lotería' : `${season.loteria_count} loterías`}
                  </span>
                </div>
              </div>
              <div className="admin-seasonal__actions">
                <button
                  type="button"
                  className="admin-packs__action-btn"
                  onClick={() => openEditForm(season)}
                  title="Editar"
                  aria-label={`Editar ${season.name_es}`}
                >
                  <FaPencilAlt />
                </button>
                <button
                  type="button"
                  className="admin-packs__action-btn"
                  onClick={() => setDeleteTarget(season)}
                  disabled={season.loteria_count > 0}
                  title={season.loteria_count > 0 ? 'Tiene loterías: primero muévelas o bórralas' : 'Borrar'}
                  aria-label={`Borrar ${season.name_es}`}
                >
                  <FaTrash />
                </button>
              </div>
            </div>
          ),
        )}
      </div>
    );
  };

  return (
    <div className="admin-packs">
      <div className="admin-packs__header">
        <h2 className="admin-packs__title">De Temporada</h2>
        <p className="admin-packs__subtitle">
          Temporadas y loterías del catálogo. El orden decide qué temporada aparece primero: el número más bajo va
          arriba.
        </p>
      </div>

      <h3 className="admin-seasonal__section-title">Temporadas</h3>

      {formTarget === 'new' ? (
        renderForm()
      ) : (
        <button type="button" className="admin-packs__add-btn" onClick={openNewForm}>
          <FaPlus /> Nueva temporada
        </button>
      )}

      {error && <p className="admin-packs__error">{error}</p>}

      {renderSeasons()}

      <AdminSeasonalLoterias seasons={seasons} onChanged={load} />

      <WarningModal
        isOpen={!!deleteTarget}
        title="Borrar temporada"
        message={deleteTarget ? `¿Borrar «${deleteTarget.name_es}»?` : ''}
        confirmText="Borrar"
        cancelText="Cancelar"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        type="danger"
      />
    </div>
  );
};
