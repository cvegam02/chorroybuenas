import { useState } from 'react';
import { FaCheck, FaPlus, FaTimes } from 'react-icons/fa';
import { AdminRepository, type AdminTokenPack } from '../../repositories/AdminRepository';
import { packMinimumError } from '../../utils/purchaseRules';

const parsePesos = (text: string) => {
  const pesos = parseFloat(text.replace(',', '.'));
  return isNaN(pesos) || pesos < 0 ? null : Math.round(pesos * 100);
};

interface AdminPackFormProps {
  /** El pack que se edita; sin él, se crea uno nuevo al final de la lista. */
  pack?: AdminTokenPack;
  /** El mayor descuento de las ofertas vigentes o programadas: el pack no puede quedar por debajo de $10 con él. */
  offerPercent: number | null;
  sortOrder: number;
  onSaved: (pack: AdminTokenPack) => void;
  onCancel: () => void;
}

/** Crear o editar un pack: tokens, de regalo y precio (FEAT-46, US A3). Mostrar u ocultar va en el interruptor. */
export const AdminPackForm = ({ pack, offerPercent, sortOrder, onSaved, onCancel }: AdminPackFormProps) => {
  const [base, setBase] = useState(pack?.base_tokens ?? 10);
  const [bonus, setBonus] = useState(pack?.bonus_tokens ?? 2);
  const [price, setPrice] = useState(pack ? (pack.price_cents / 100).toFixed(2) : '20');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const idPrefix = `admin-pack-${pack?.id ?? 'new'}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const priceCents = parsePesos(price);
    if (priceCents == null) {
      setError('Precio inválido');
      return;
    }
    if (base < 1 || bonus < 0) {
      setError('Los tokens deben ser 1 o más, y los de regalo 0 o más.');
      return;
    }
    // Mínimo de compra de $10, también con la oferta (FEAT-58, decisión 2)
    const belowMinimum = packMinimumError(priceCents, offerPercent);
    if (belowMinimum) {
      setError(belowMinimum);
      return;
    }
    setIsSaving(true);
    setError(null);
    const fields = { base_tokens: base, bonus_tokens: bonus, price_cents: priceCents };
    const saved = pack
      ? await AdminRepository.updateTokenPack(pack.id, fields)
      : await AdminRepository.createTokenPack({ ...fields, sort_order: sortOrder });
    setIsSaving(false);
    if (saved) onSaved(saved);
    else setError(pack ? 'Error al guardar' : 'Error al crear (¿ya existe un pack con esos tokens y regalo?)');
  };

  return (
    <form className={pack ? 'admin-pricing__card' : 'admin-packs__new-form'} onSubmit={handleSubmit}>
      <div className="admin-packs__new-row">
        <div className="admin-packs__field">
          <label htmlFor={`${idPrefix}-base`}>Tokens</label>
          <input id={`${idPrefix}-base`} type="number" min={1} value={base}
            onChange={(e) => setBase(parseInt(e.target.value, 10) || 1)} />
        </div>
        <div className="admin-packs__field">
          <label htmlFor={`${idPrefix}-bonus`}>De regalo</label>
          <input id={`${idPrefix}-bonus`} type="number" min={0} value={bonus}
            onChange={(e) => setBonus(parseInt(e.target.value, 10) || 0)} />
        </div>
        <div className="admin-packs__field">
          <label htmlFor={`${idPrefix}-price`}>Precio (MXN)</label>
          <input id={`${idPrefix}-price`} type="number" min={0} step={0.01} value={price}
            onChange={(e) => setPrice(e.target.value)} />
        </div>
      </div>
      <div className="admin-packs__new-actions">
        <button type="button" className="admin-packs__btn admin-packs__btn--secondary" onClick={onCancel}>
          <FaTimes /> Cancelar
        </button>
        <button type="submit" className="admin-packs__btn admin-packs__btn--primary" disabled={isSaving}>
          {pack ? <><FaCheck /> Guardar</> : <><FaPlus /> Crear</>}
        </button>
      </div>
      {error && <p className="admin-packs__error" role="alert">{error}</p>}
    </form>
  );
};
