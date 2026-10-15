import { useEffect, useState } from 'react';
import { AdminRepository } from '../../repositories/AdminRepository';
import { AppConfigRepository } from '../../repositories/AppConfigRepository';
import { welcomeEstimateLabel } from '../../utils/adminPricing';
import { AdminPriceCard } from './AdminPriceCard';

interface AdminPricingBasicsProps {
  /** Precio por token vigente; nulo mientras carga o si no se pudo leer. */
  priceCents: number | null;
  priceError: boolean;
  onPriceSaved: (priceCents: number) => void;
}

/** «Lo básico» de Precios y promos (FEAT-46): precio por token (editable desde US A2) y tokens de bienvenida. */
export const AdminPricingBasics = ({ priceCents, priceError, onPriceSaved }: AdminPricingBasicsProps) => {
  const [newAccounts, setNewAccounts] = useState<number | null>(null);
  // Lo guardado (para el estimado) y lo que se está escribiendo.
  const [welcomeSaved, setWelcomeSaved] = useState<number | null>(null);
  const [welcomeDraft, setWelcomeDraft] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  useEffect(() => {
    let current = true;
    Promise.all([
      AppConfigRepository.getInitialTokens(),
      AdminRepository.getUsersCount('', 'new_this_month'),
    ]).then(([welcome, fresh]) => {
      if (!current) return;
      setWelcomeSaved(welcome);
      setWelcomeDraft(String(welcome));
      setNewAccounts(fresh);
    });
    return () => {
      current = false;
    };
  }, []);

  const handleSaveWelcome = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(welcomeDraft);
    if (welcomeDraft.trim() === '' || !Number.isInteger(amount) || amount < 0) {
      setStatus({ kind: 'error', text: 'Escribe un número entero de 0 en adelante.' });
      return;
    }
    setIsSaving(true);
    setStatus(null);
    const ok = await AppConfigRepository.updateInitialTokens(amount);
    setIsSaving(false);
    if (ok) {
      setWelcomeSaved(amount);
      setStatus({ kind: 'ok', text: 'Guardado.' });
    } else {
      setStatus({ kind: 'error', text: 'No se pudo guardar. Intenta de nuevo.' });
    }
  };

  return (
    <div className="admin-pricing__grid">
      {priceCents != null ? (
        <AdminPriceCard priceCents={priceCents} onSaved={onPriceSaved} />
      ) : (
        <div className="admin-pricing__card">
          <span className="admin-pricing__label">Precio por token</span>
          {priceError ? (
            <p className="admin-pricing__error">No se pudo cargar el precio por token.</p>
          ) : (
            <p className="admin-pricing__muted">Cargando…</p>
          )}
        </div>
      )}

      <form className="admin-pricing__card" onSubmit={handleSaveWelcome}>
        <label htmlFor="admin-pricing-welcome" className="admin-pricing__label">
          Tokens de bienvenida
        </label>
        <div className="admin-pricing__row">
          <input
            id="admin-pricing-welcome"
            className="admin-pricing__input"
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            value={welcomeDraft}
            onChange={(e) => {
              setWelcomeDraft(e.target.value);
              setStatus(null);
            }}
            disabled={welcomeSaved == null}
          />
          <span className="admin-pricing__muted">tokens por cuenta nueva</span>
          <button
            type="submit"
            className="admin-pricing__btn"
            disabled={isSaving || welcomeSaved == null || welcomeDraft === String(welcomeSaved)}
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
        {welcomeSaved != null && newAccounts != null && priceCents != null && (
          <p className="admin-pricing__muted">{welcomeEstimateLabel(newAccounts, welcomeSaved, priceCents)}</p>
        )}
      </form>
    </div>
  );
};
