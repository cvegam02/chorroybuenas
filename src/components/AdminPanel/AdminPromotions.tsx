import { useEffect, useState } from 'react';
import { FaPlus } from 'react-icons/fa';
import {
  AdminRepository,
  type AdminPromotion,
  type AdminTokenPack,
  type PromotionUsage,
} from '../../repositories/AdminRepository';
import { previewPack, promoName } from '../../utils/adminPromotions';
import { WarningModal } from '../ConfirmationModal/WarningModal';
import { AdminPromotionForm } from './AdminPromotionForm';
import { AdminPromotionsTable } from './AdminPromotionsTable';

interface AdminPromotionsProps {
  /** Id del título de la sección, para `aria-labelledby`. */
  titleId: string;
}

/** Sección «Promociones» de Precios y promos (FEAT-46, US A4): formulario plegable, tabla con estado y usos. */
export const AdminPromotions = ({ titleId }: AdminPromotionsProps) => {
  const [promotions, setPromotions] = useState<AdminPromotion[]>([]);
  const [usage, setUsage] = useState<Record<string, PromotionUsage> | null>(null);
  const [packs, setPacks] = useState<AdminTokenPack[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // Nulo: formulario cerrado; 'new': creando; una promoción: editándola.
  const [editing, setEditing] = useState<AdminPromotion | 'new' | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminPromotion | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let current = true;
    Promise.all([AdminRepository.getPromotions(), AdminRepository.getPromotionUsage(), AdminRepository.getTokenPacks()]).then(
      ([promos, uses, packList]) => {
        if (!current) return;
        setPromotions(promos);
        setUsage(uses);
        setPacks(packList);
        setIsLoading(false);
      },
    );
    return () => {
      current = false;
    };
  }, []);

  const handleSaved = (saved: AdminPromotion) => {
    setPromotions((prev) =>
      prev.some((p) => p.id === saved.id) ? prev.map((p) => (p.id === saved.id ? saved : p)) : [saved, ...prev],
    );
    setEditing(null);
  };

  const handleToggle = async (p: AdminPromotion) => {
    setTogglingId(p.id);
    setError(null);
    const updated = await AdminRepository.updatePromotion(p.id, { is_active: !p.is_active });
    setTogglingId(null);
    if (updated) setPromotions((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
    else setError(p.is_active ? 'No se pudo apagar la promoción.' : 'No se pudo encender la promoción.');
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { id } = deleteTarget;
    setDeleteTarget(null);
    setError(null);
    if (await AdminRepository.deletePromotion(id)) {
      setPromotions((prev) => prev.filter((p) => p.id !== id));
      if (editing !== 'new' && editing?.id === id) setEditing(null);
    } else {
      setError('No se pudo borrar la promoción.');
    }
  };

  return (
    <>
      <div className="admin-pricing__section-head">
        <h3 id={titleId} className="admin-pricing__section-title">Promociones</h3>
        {editing == null && (
          <button type="button" className="admin-pricing__btn admin-pricing__btn--primary" onClick={() => setEditing('new')}>
            <FaPlus aria-hidden="true" /> Nueva promoción
          </button>
        )}
      </div>

      {editing != null && (
        <AdminPromotionForm
          key={editing === 'new' ? 'new' : editing.id}
          promotion={editing === 'new' ? null : editing}
          previewPack={previewPack(packs)}
          onSaved={handleSaved}
          onCancel={() => setEditing(null)}
        />
      )}

      {error && <p className="admin-pricing__error" role="alert">{error}</p>}

      {isLoading ? (
        <p className="admin-pricing__muted">Cargando promociones…</p>
      ) : promotions.length === 0 ? (
        <p className="admin-pricing__muted">No hay promociones. Crea una con «Nueva promoción».</p>
      ) : (
        <AdminPromotionsTable
          promotions={promotions}
          usage={usage}
          togglingId={togglingId}
          onToggle={handleToggle}
          onEdit={(p) => setEditing(p)}
          onDelete={setDeleteTarget}
        />
      )}

      <p className="admin-pricing__muted">
        Si aplican las dos, gana el código; no se suman. Cada cliente puede usar un código una sola vez.
      </p>

      <WarningModal
        isOpen={!!deleteTarget}
        title="Eliminar promoción"
        message={deleteTarget ? `¿Eliminar «${promoName(deleteTarget)}»?` : ''}
        confirmText="Eliminar"
        cancelText="Cancelar"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        type="danger"
      />
    </>
  );
};
