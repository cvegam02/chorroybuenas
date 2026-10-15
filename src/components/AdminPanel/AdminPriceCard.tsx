import { useState } from 'react';
import { AdminRepository } from '../../repositories/AdminRepository';
import { minimumPurchaseLabel, parsePriceInput, priceChangeMessage } from '../../utils/adminPricing';
import { WarningModal } from '../ConfirmationModal/WarningModal';

const toDraft = (cents: number) => (cents / 100).toFixed(2);

interface AdminPriceCardProps {
  priceCents: number;
  onSaved: (priceCents: number) => void;
}

/** Precio por token editable, con confirmación al guardar (FEAT-46, US A2). */
export const AdminPriceCard = ({ priceCents, onSaved }: AdminPriceCardProps) => {
  const [draft, setDraft] = useState(() => toDraft(priceCents));
  const [pending, setPending] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cents = parsePriceInput(draft);
    if (cents == null) {
      setStatus({ kind: 'error', text: 'Escribe un precio mayor que cero, con hasta dos decimales.' });
      return;
    }
    if (cents === priceCents) return;
    setStatus(null);
    setPending(cents);
  };

  const handleCancel = () => {
    setPending(null);
    setDraft(toDraft(priceCents));
  };

  const handleConfirm = async () => {
    if (pending == null) return;
    const cents = pending;
    setPending(null);
    setIsSaving(true);
    const saved = await AdminRepository.setPricePerToken(cents);
    setIsSaving(false);
    if (saved == null) {
      setStatus({ kind: 'error', text: 'No se pudo cambiar el precio. Intenta de nuevo.' });
      return;
    }
    setDraft(toDraft(saved));
    setStatus({ kind: 'ok', text: 'Guardado.' });
    onSaved(saved);
  };

  return (
    <>
      <form className="admin-pricing__card" onSubmit={handleSubmit}>
        <label htmlFor="admin-pricing-price" className="admin-pricing__label">
          Precio por token
        </label>
        <div className="admin-pricing__row">
          <span className="admin-pricing__currency" aria-hidden="true">$</span>
          <input
            id="admin-pricing-price"
            className="admin-pricing__input admin-pricing__input--price"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              setStatus(null);
            }}
          />
          <span className="admin-pricing__muted">MXN</span>
          <button
            type="submit"
            className="admin-pricing__btn"
            disabled={isSaving || parsePriceInput(draft) === priceCents}
          >
            {isSaving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
        <p
          className={status?.kind === 'error' ? 'admin-pricing__error' : 'admin-pricing__ok'}
          role="status"
          aria-live="polite"
        >
          {status?.text}
        </p>
        <p className="admin-pricing__muted">
          Lo que cuesta cada token cuando el cliente elige una cantidad libre. {minimumPurchaseLabel(priceCents)}
        </p>
      </form>

      <WarningModal
        isOpen={pending != null}
        title="Cambiar el precio por token"
        message={pending != null ? priceChangeMessage(priceCents, pending) : ''}
        confirmText="Cambiar precio"
        cancelText="Cancelar"
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </>
  );
};
