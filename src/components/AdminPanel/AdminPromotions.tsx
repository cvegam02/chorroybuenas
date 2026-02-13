import { useEffect, useState } from 'react';
import { FaPlus, FaPencilAlt, FaTrash, FaTimes, FaSave } from 'react-icons/fa';
import { AdminRepository, type AdminPromotion } from '../../repositories/AdminRepository';
import { AppConfigRepository } from '../../repositories/AppConfigRepository';
import { WarningModal } from '../ConfirmationModal/WarningModal';
import './AdminPromotions.css';

const formatDate = (iso: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const PROMO_TYPES = [
  { id: 'first_purchase', label: 'Primera compra', desc: 'Regala X% extra de tokens a quien compra por primera vez' },
  { id: 'code', label: 'Código de descuento', desc: 'El usuario introduce un código y recibe X% extra' },
] as const;

type FormState = {
  id: string | null;
  promoType: 'first_purchase' | 'code';
  code: string;
  percent: number;
  valid_from: string;
  valid_until: string;
  is_active: boolean;
};

const emptyForm: FormState = {
  id: null,
  promoType: 'first_purchase',
  code: '',
  percent: 20,
  valid_from: '',
  valid_until: '',
  is_active: true,
};

const formToConfig = (f: FormState): Record<string, unknown> => ({ percent: f.percent });
const formToType = (f: FormState): string => f.promoType;
const formToCode = (f: FormState): string | null => (f.promoType === 'code' ? f.code.trim() || null : null);

const promotionToForm = (p: AdminPromotion | null): FormState => {
  if (!p) return emptyForm;
  const percent = typeof (p.config as { percent?: number })?.percent === 'number' ? (p.config as { percent: number }).percent : 20;
  const isCode = p.type === 'code';
  return {
    id: p.id,
    promoType: isCode ? 'code' : 'first_purchase',
    code: (p.code ?? '').trim(),
    percent,
    valid_from: p.valid_from ? p.valid_from.slice(0, 16) : '',
    valid_until: p.valid_until ? p.valid_until.slice(0, 16) : '',
    is_active: p.is_active,
  };
};

/** Descripción legible de una promoción */
const getPromoDescription = (p: AdminPromotion): string => {
  const percent = typeof (p.config as { percent?: number })?.percent === 'number' ? (p.config as { percent: number }).percent : 0;
  if (p.type === 'first_purchase') return `Primera compra: +${percent}% tokens gratis`;
  if (p.type === 'code' && p.code) return `Código "${p.code}": +${percent}% tokens`;
  return `${p.type}: +${percent}%`;
};

export const AdminPromotions = () => {
  const [promotions, setPromotions] = useState<AdminPromotion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminPromotion | null>(null);
  const [initialTokens, setInitialTokens] = useState<number>(0);
  const [initialTokensSaving, setInitialTokensSaving] = useState(false);

  const load = async () => {
    setIsLoading(true);
    const data = await AdminRepository.getPromotions();
    setPromotions(data);
    setIsLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    AppConfigRepository.getInitialTokens().then(setInitialTokens);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSaving(true);

    if (form.promoType === 'code' && !form.code.trim()) {
      setError('El código es obligatorio para promociones por código.');
      setIsSaving(false);
      return;
    }
    const percent = Math.round(form.percent);
    if (percent < 1 || percent > 100) {
      setError('El porcentaje debe estar entre 1 y 100.');
      setIsSaving(false);
      return;
    }

    const config = formToConfig(form);
    const type = formToType(form);
    const code = formToCode(form);

    const toIso = (s: string) => {
      const t = s.trim();
      if (!t) return null;
      return t.length === 16 ? `${t}:00` : t;
    };
    const validFrom = toIso(form.valid_from);
    const validUntil = toIso(form.valid_until);

    if (form.id) {
      const updated = await AdminRepository.updatePromotion(form.id, {
        code,
        type,
        config,
        valid_from: validFrom,
        valid_until: validUntil,
        is_active: form.is_active,
      });
      if (updated) {
        setPromotions((prev) => prev.map((p) => (p.id === form.id ? updated : p)));
        setForm(emptyForm);
      } else {
        setError('Error al actualizar');
      }
    } else {
      const created = await AdminRepository.createPromotion({
        code,
        type,
        config,
        valid_from: validFrom,
        valid_until: validUntil,
        is_active: form.is_active,
      });
      if (created) {
        setPromotions((prev) => [created, ...prev]);
        setForm(emptyForm);
      } else {
        setError('Error al crear');
      }
    }
    setIsSaving(false);
  };

  const handleEdit = (p: AdminPromotion) => {
    setForm(promotionToForm(p));
    setError(null);
  };

  const handleCancel = () => {
    setForm(emptyForm);
    setError(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    setDeleteTarget(null);
    const ok = await AdminRepository.deletePromotion(id);
    if (ok) {
      setPromotions((prev) => prev.filter((p) => p.id !== id));
    }
  };

  const handleToggleActive = async (p: AdminPromotion) => {
    const updated = await AdminRepository.updatePromotion(p.id, {
      is_active: !p.is_active,
    });
    if (updated) {
      setPromotions((prev) => prev.map((pr) => (pr.id === p.id ? updated : pr)));
    }
  };

  const handleSaveInitialTokens = async () => {
    setInitialTokensSaving(true);
    const ok = await AppConfigRepository.updateInitialTokens(initialTokens);
    setInitialTokensSaving(false);
    if (!ok) setError('Error al guardar tokens iniciales');
  };

  return (
    <div className="admin-promotions">
      <div className="admin-promotions__header">
        <h2 className="admin-promotions__title">Promociones</h2>
        <p className="admin-promotions__subtitle">
          Regala tokens extra en compras: primera compra o códigos de descuento
        </p>
      </div>

      <div className="admin-promotions__config-section">
        <h3 className="admin-promotions__form-section-title">Configuración general</h3>
        <div className="admin-promotions__config-row">
          <div className="admin-promotions__field">
            <label htmlFor="initial-tokens">Tokens iniciales (usuarios nuevos)</label>
            <div className="admin-promotions__config-input">
              <input
                id="initial-tokens"
                type="number"
                min={0}
                value={initialTokens}
                onChange={(e) => setInitialTokens(Math.max(0, parseInt(e.target.value, 10) || 0))}
              />
              <button
                type="button"
                className="admin-promotions__btn admin-promotions__btn--primary admin-promotions__btn--small"
                onClick={handleSaveInitialTokens}
                disabled={initialTokensSaving}
              >
                {initialTokensSaving ? '…' : <><FaSave /> Guardar</>}
              </button>
            </div>
            <p className="admin-promotions__field-hint">Tokens que reciben al registrarse. 0 = ninguno</p>
          </div>
        </div>
      </div>

      <form className="admin-promotions__form" onSubmit={handleSubmit}>
        <div className="admin-promotions__form-section">
          <h3 className="admin-promotions__form-section-title">{form.id ? 'Editar promoción' : 'Nueva promoción'}</h3>

          <div className="admin-promotions__field">
            <label>Tipo de promoción</label>
            <select
              value={form.promoType}
              onChange={(e) => setForm((f) => ({ ...f, promoType: e.target.value as 'first_purchase' | 'code' }))}
              className="admin-promotions__select"
            >
              {PROMO_TYPES.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
            <p className="admin-promotions__field-hint">{PROMO_TYPES.find((t) => t.id === form.promoType)?.desc}</p>
          </div>

          {form.promoType === 'code' && (
            <div className="admin-promotions__field">
              <label htmlFor="promo-code">Código que el usuario escribirá</label>
              <input
                id="promo-code"
                type="text"
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="Ej: VERANO2025"
                maxLength={32}
              />
            </div>
          )}

          <div className="admin-promotions__field admin-promotions__field--percent">
            <label htmlFor="promo-percent">Porcentaje extra de tokens (1–100)</label>
            <div className="admin-promotions__percent-input">
              <input
                id="promo-percent"
                type="number"
                min={1}
                max={100}
                value={form.percent}
                onChange={(e) => setForm((f) => ({ ...f, percent: Math.max(1, Math.min(100, Number(e.target.value) || 1)) }))}
              />
              <span className="admin-promotions__percent-suffix">%</span>
            </div>
            <p className="admin-promotions__field-hint">Ej: 20 = el usuario recibe 20% más tokens gratis</p>
          </div>

          <div className="admin-promotions__form-row">
            <div className="admin-promotions__field">
              <label htmlFor="promo-valid-from">Válido desde</label>
              <input
                id="promo-valid-from"
                type="datetime-local"
                value={form.valid_from}
                onChange={(e) => setForm((f) => ({ ...f, valid_from: e.target.value }))}
                title="Opcional: deja vacío para sin límite"
              />
              <p className="admin-promotions__field-hint">Opcional</p>
            </div>
            <div className="admin-promotions__field">
              <label htmlFor="promo-valid-until">Válido hasta</label>
              <input
                id="promo-valid-until"
                type="datetime-local"
                value={form.valid_until}
                onChange={(e) => setForm((f) => ({ ...f, valid_until: e.target.value }))}
                title="Opcional: deja vacío para sin límite"
              />
              <p className="admin-promotions__field-hint">Opcional</p>
            </div>
          </div>

          <div className="admin-promotions__form-row admin-promotions__form-actions">
            <label className="admin-promotions__checkbox">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
              />
              Activa (solo se aplican promociones activas)
            </label>
            <div className="admin-promotions__buttons">
              {form.id && (
                <button type="button" className="admin-promotions__btn admin-promotions__btn--secondary" onClick={handleCancel}>
                  <FaTimes /> Cancelar
                </button>
              )}
              <button type="submit" className="admin-promotions__btn admin-promotions__btn--primary" disabled={isSaving}>
                {form.id ? <FaPencilAlt /> : <FaPlus />}
                {form.id ? 'Guardar cambios' : 'Crear promoción'}
              </button>
            </div>
          </div>
        </div>
        {error && <p className="admin-promotions__error">{error}</p>}
      </form>

      {isLoading ? (
        <div className="admin-promotions__loading">
          <div className="admin-promotions__spinner" />
          <span>Cargando...</span>
        </div>
      ) : promotions.length === 0 ? (
        <p className="admin-promotions__empty">No hay promociones.</p>
      ) : (
        <div className="admin-promotions__list">
          {promotions.map((p) => (
            <div key={p.id} className={`admin-promotions__card ${!p.is_active ? 'admin-promotions__card--inactive' : ''}`}>
              <div className="admin-promotions__card-body">
                <div className="admin-promotions__card-main">
                  <span className="admin-promotions__card-desc">{getPromoDescription(p)}</span>
                </div>
                <div className="admin-promotions__card-dates">
                  {formatDate(p.valid_from)} — {formatDate(p.valid_until)}
                </div>
                <div className="admin-promotions__card-badges">
                  <span className={`admin-promotions__badge ${p.is_active ? 'admin-promotions__badge--active' : 'admin-promotions__badge--inactive'}`}>
                    {p.is_active ? 'Activa' : 'Inactiva'}
                  </span>
                </div>
              </div>
              <div className="admin-promotions__card-actions">
                <button
                  type="button"
                  className="admin-promotions__action-btn"
                  onClick={() => handleToggleActive(p)}
                  title={p.is_active ? 'Desactivar' : 'Activar'}
                >
                  {p.is_active ? 'Desactivar' : 'Activar'}
                </button>
                <button type="button" className="admin-promotions__action-btn" onClick={() => handleEdit(p)} title="Editar">
                  <FaPencilAlt />
                </button>
                <button type="button" className="admin-promotions__action-btn admin-promotions__action-btn--danger" onClick={() => setDeleteTarget(p)} title="Eliminar">
                  <FaTrash />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <WarningModal
        isOpen={!!deleteTarget}
        title="Eliminar promoción"
        message={deleteTarget ? `¿Eliminar "${getPromoDescription(deleteTarget)}"?` : ''}
        confirmText="Eliminar"
        cancelText="Cancelar"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        type="danger"
      />
    </div>
  );
};
