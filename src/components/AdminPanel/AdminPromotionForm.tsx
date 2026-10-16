import { useState } from 'react';
import { AdminRepository, type AdminPromotion, type AdminTokenPack } from '../../repositories/AdminRepository';
import {
  dateInputFromIso,
  promoPercent,
  promoPreviewText,
  validFromIso,
  validUntilIso,
} from '../../utils/adminPromotions';

type PromoType = 'code' | 'first_purchase';

const TYPES: { id: PromoType; label: string }[] = [
  { id: 'code', label: 'Código que el cliente escribe' },
  { id: 'first_purchase', label: 'Primera compra (automática)' },
];

interface AdminPromotionFormProps {
  /** La promoción que se edita; nula para crear una. */
  promotion: AdminPromotion | null;
  previewPack: AdminTokenPack | null;
  onSaved: (promotion: AdminPromotion) => void;
  onCancel: () => void;
}

/** Formulario de promoción con vista previa (FEAT-46, US A4, decisión 5). Las nuevas nacen encendidas. */
export const AdminPromotionForm = ({ promotion, previewPack, onSaved, onCancel }: AdminPromotionFormProps) => {
  const [type, setType] = useState<PromoType>(promotion?.type === 'first_purchase' ? 'first_purchase' : 'code');
  const [code, setCode] = useState(promotion?.code ?? '');
  const [percent, setPercent] = useState(promotion ? String(promoPercent(promotion)) : '20');
  const [from, setFrom] = useState(dateInputFromIso(promotion?.valid_from ?? null));
  const [until, setUntil] = useState(dateInputFromIso(promotion?.valid_until ?? null));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const percentValue = Number(percent);
  const percentOk = Number.isInteger(percentValue) && percentValue >= 1 && percentValue <= 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (type === 'code' && !code.trim()) {
      setError('Escribe el código que usará el cliente.');
      return;
    }
    if (!percentOk) {
      setError('Los tokens extra van de 1 a 100 %.');
      return;
    }
    if (from && until && from > until) {
      setError('La fecha «Hasta» no puede ser antes de «Desde».');
      return;
    }
    setIsSaving(true);
    setError(null);
    const fields = {
      type,
      code: type === 'code' ? code.trim() : null,
      config: { percent: percentValue },
      valid_from: validFromIso(from),
      valid_until: validUntilIso(until),
    };
    const saved = promotion
      ? await AdminRepository.updatePromotion(promotion.id, fields)
      : await AdminRepository.createPromotion({ ...fields, is_active: true });
    setIsSaving(false);
    if (saved) onSaved(saved);
    else setError(promotion ? 'No se pudo guardar. ¿Ya existe otro con ese código?' : 'No se pudo crear. ¿Ya existe ese código?');
  };

  return (
    <form className="admin-pricing__card admin-pricing__promo-form" onSubmit={handleSubmit}>
      <h4 className="admin-pricing__form-title">{promotion ? 'Editar promoción' : 'Nueva promoción'}</h4>

      <div className="admin-pricing__choices" role="group" aria-label="Tipo de promoción">
        {TYPES.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-pressed={type === t.id}
            className={`admin-pricing__choice${type === t.id ? ' admin-pricing__choice--on' : ''}`}
            onClick={() => setType(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="admin-pricing__fields">
        {type === 'code' && (
          <label className="admin-pricing__field">
            Código
            <input className="admin-pricing__text" type="text" value={code} maxLength={32} placeholder="Ej: MUERTOS26"
              onChange={(e) => setCode(e.target.value.toUpperCase())} />
          </label>
        )}
        <label className="admin-pricing__field">
          Tokens extra (%)
          <input className="admin-pricing__text" type="number" min={1} max={100} step={1} value={percent}
            onChange={(e) => setPercent(e.target.value)} />
        </label>
        <label className="admin-pricing__field">
          Desde (opcional)
          <input className="admin-pricing__text" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="admin-pricing__field">
          Hasta (opcional)
          <input className="admin-pricing__text" type="date" value={until} onChange={(e) => setUntil(e.target.value)} />
        </label>
      </div>

      {percentOk && <p className="admin-pricing__preview">Así se vería: {promoPreviewText(previewPack, percentValue)}</p>}
      {error && <p className="admin-pricing__error" role="alert">{error}</p>}

      <div className="admin-pricing__form-actions">
        <button type="button" className="admin-pricing__btn" onClick={onCancel}>Cancelar</button>
        <button type="submit" className="admin-pricing__btn admin-pricing__btn--primary" disabled={isSaving}>
          {isSaving ? 'Guardando…' : promotion ? 'Guardar cambios' : 'Crear promoción'}
        </button>
      </div>
    </form>
  );
};
