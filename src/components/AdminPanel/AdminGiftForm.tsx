import { useState } from 'react';

const GIFT_REASON_MAX_LENGTH = 200;

interface AdminGiftFormProps {
  /** Regala y dice si salió bien. */
  onGift: (amount: number, reason: string) => Promise<boolean>;
  onCancel: () => void;
}

/** Formulario de «Regalar tokens»: cantidad y motivo opcional, con el aviso del correo (fase 3). */
export const AdminGiftForm = ({ onGift, onCancel }: AdminGiftFormProps) => {
  const [amount, setAmount] = useState('10');
  const [reason, setReason] = useState('');
  const [isGifting, setIsGifting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const tokens = Number(amount);
    if (!Number.isInteger(tokens) || tokens < 1) {
      setError('Escribe una cantidad de tokens mayor que cero.');
      return;
    }
    setIsGifting(true);
    setError(null);
    const ok = await onGift(tokens, reason);
    setIsGifting(false);
    if (!ok) setError('No se pudieron regalar los tokens. Inténtalo otra vez.');
  };

  return (
    <form className="admin-gift-form" onSubmit={submit}>
      <label className="admin-gift-form__field">
        Cantidad de tokens
        <input
          className="admin-sales__field"
          type="number"
          min={1}
          step={1}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </label>
      <label className="admin-gift-form__field">
        Motivo (opcional)
        <input
          className="admin-sales__field"
          type="text"
          maxLength={GIFT_REASON_MAX_LENGTH}
          placeholder="Por ejemplo: compensación por un error"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </label>
      <p className="admin-sales__muted">Le llegará un correo avisándole del regalo.</p>
      {error && (
        <p className="admin-gift-form__error" role="alert">
          {error}
        </p>
      )}
      <div className="admin-gift-form__actions">
        <button type="button" className="admin-gift-form__btn" onClick={onCancel}>
          Cancelar
        </button>
        <button type="submit" className="admin-gift-form__btn admin-gift-form__btn--primary" disabled={isGifting}>
          {isGifting ? 'Regalando…' : 'Regalar'}
        </button>
      </div>
    </form>
  );
};
