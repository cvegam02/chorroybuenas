import { useEffect, useState } from 'react';
import { FaCheck, FaPencilAlt, FaTimes, FaTrash } from 'react-icons/fa';
import { SeasonalRepository, SEASON_NAME_MAX_LENGTH, type AdminSeason } from '../../repositories/SeasonalRepository';
import { useDragReorder } from '../../hooks/useDragReorder';
import { WarningModal } from '../ConfirmationModal/WarningModal';

interface AdminSeasonalThemesProps {
  /** En el orden del catálogo. */
  seasons: readonly AdminSeason[];
  /** Se llama tras cualquier cambio guardado, para volver a cargar la pantalla. */
  onChanged: () => void;
}

interface RenameDraft {
  id: string;
  nameEs: string;
  nameEn: string;
}

const loteriaCount = (count: number) =>
  count === 0 ? 'Sin loterías' : count === 1 ? '1 lotería' : `${count} loterías`;

/** «Administrar temáticas» (FEAT-48, decisión 3): ordenar arrastrando, renombrar, agregar y borrar sin loterías. */
export const AdminSeasonalThemes = ({ seasons, onChanged }: AdminSeasonalThemesProps) => {
  const [order, setOrder] = useState<AdminSeason[]>([...seasons]);
  const [rename, setRename] = useState<RenameDraft | null>(null);
  const [newName, setNewName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminSeason | null>(null);

  useEffect(() => setOrder([...seasons]), [seasons]);

  const saveOrder = async (next: AdminSeason[]) => {
    const previous = order;
    setOrder(next);
    setError(null);
    const saved = await SeasonalRepository.setSeasonOrder(next.map((season) => season.id));
    if (!saved) {
      setOrder(previous);
      setError('No se pudo guardar el orden. Intenta de nuevo.');
      return;
    }
    onChanged();
  };

  const reorder = useDragReorder(order, (season) => season.id, saveOrder);

  const run = async (action: () => Promise<boolean>, failure: string) => {
    setIsSaving(true);
    setError(null);
    const ok = await action();
    setIsSaving(false);
    if (!ok) {
      setError(failure);
      return false;
    }
    onChanged();
    return true;
  };

  const handleRename = async (e: React.FormEvent, season: AdminSeason) => {
    e.preventDefault();
    if (!rename || rename.nameEs.trim() === '') {
      setError('Escribe el nombre de la temática.');
      return;
    }
    const input = { name_es: rename.nameEs, name_en: rename.nameEn, sort_order: season.sort_order };
    const ok = await run(
      async () => (await SeasonalRepository.updateSeason(season.id, input)) !== null,
      'No se pudo renombrar la temática. Intenta de nuevo.',
    );
    if (ok) setRename(null);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim() === '') {
      setError('Escribe el nombre de la temática nueva.');
      return;
    }
    const sortOrder = order.reduce((max, season) => Math.max(max, season.sort_order + 1), 0);
    const ok = await run(
      async () => (await SeasonalRepository.createSeason({ name_es: newName, name_en: null, sort_order: sortOrder })) !== null,
      'No se pudo agregar la temática. Intenta de nuevo.',
    );
    if (ok) setNewName('');
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    await run(() => SeasonalRepository.deleteSeason(target.id), `No se pudo borrar «${target.name_es}». Intenta de nuevo.`);
  };

  const renderRow = (season: AdminSeason) => {
    if (rename?.id === season.id) {
      return (
        <form className="admin-themes__row admin-themes__row--editing" onSubmit={(e) => handleRename(e, season)}>
          <label className="admin-themes__rename-field">
            <span>Nombre</span>
            <input
              type="text"
              maxLength={SEASON_NAME_MAX_LENGTH}
              value={rename.nameEs}
              onChange={(e) => setRename({ ...rename, nameEs: e.target.value })}
              autoFocus
            />
          </label>
          <label className="admin-themes__rename-field">
            <span>En inglés (opcional)</span>
            <input
              type="text"
              maxLength={SEASON_NAME_MAX_LENGTH}
              value={rename.nameEn}
              onChange={(e) => setRename({ ...rename, nameEn: e.target.value })}
            />
          </label>
          <div className="admin-themes__row-actions">
            <button type="submit" className="admin-pricing__icon-btn" aria-label="Guardar nombre" disabled={isSaving}>
              <FaCheck aria-hidden="true" />
            </button>
            <button type="button" className="admin-pricing__icon-btn" aria-label="Cancelar" onClick={() => setRename(null)}>
              <FaTimes aria-hidden="true" />
            </button>
          </div>
        </form>
      );
    }
    return (
      <div className="admin-themes__row">
        <button
          type="button"
          className="admin-themes__handle"
          aria-label={`Mover «${season.name_es}»: arrastra o usa las flechas`}
          {...reorder.handleProps(season)}
        >
          ⋮⋮
        </button>
        <span className="admin-themes__name">{season.name_es}</span>
        <span className="admin-pricing__muted">{loteriaCount(season.loteria_count)}</span>
        <div className="admin-themes__row-actions">
          <button
            type="button"
            className="admin-pricing__icon-btn"
            aria-label={`Renombrar «${season.name_es}»`}
            onClick={() => setRename({ id: season.id, nameEs: season.name_es, nameEn: season.name_en ?? '' })}
          >
            <FaPencilAlt aria-hidden="true" />
          </button>
          {season.loteria_count === 0 && (
            <button
              type="button"
              className="admin-pricing__icon-btn admin-pricing__icon-btn--danger"
              aria-label={`Borrar «${season.name_es}»`}
              onClick={() => setDeleteTarget(season)}
            >
              <FaTrash aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <section className="admin-themes__panel" aria-labelledby="admin-themes-title">
      <div className="admin-themes__panel-head">
        <h3 id="admin-themes-title" className="admin-themes__panel-title">
          Temáticas
        </h3>
        <span className="admin-pricing__muted">Arrastra para cambiar el orden del catálogo</span>
      </div>

      {order.length === 0 && <p className="admin-pricing__muted">Aún no hay temáticas. Agrega la primera.</p>}

      <ul className="admin-themes__list">
        {reorder.shown.map((season) => (
          <li
            key={season.id}
            ref={reorder.register(season.id)}
            className={reorder.draggingKey === season.id ? 'admin-themes__item--dragging' : undefined}
          >
            {renderRow(season)}
          </li>
        ))}
      </ul>

      <form className="admin-themes__add" onSubmit={handleAdd}>
        <input
          type="text"
          className="admin-themes__add-field"
          aria-label="Nueva temática"
          maxLength={SEASON_NAME_MAX_LENGTH}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nueva temática, p. ej. Graduación"
        />
        <button type="submit" className="admin-pricing__btn admin-themes__add-btn" disabled={isSaving}>
          Agregar
        </button>
      </form>

      {error && (
        <p className="admin-pricing__error" role="alert">
          {error}
        </p>
      )}

      <WarningModal
        isOpen={!!deleteTarget}
        title="Borrar temática"
        message={deleteTarget ? `¿Borrar «${deleteTarget.name_es}»?` : ''}
        confirmText="Borrar"
        cancelText="Cancelar"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        type="danger"
      />
    </section>
  );
};
