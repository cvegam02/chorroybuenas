import { useEffect, useState } from 'react';
import { AdminRepository } from '../../repositories/AdminRepository';
import { TokenPricingRepository } from '../../repositories/TokenPricingRepository';
import { aiCostDraft, aiCostPesosLabel, parseAiCostInput } from '../../utils/adminPricing';

/**
 * «Costo de IA por imagen», tercera tarjeta de «Lo básico» (FEAT-47, US A1): en US$, con su equivalente
 * en pesos. Sin confirmación al guardar (decisión 3). El Resumen usa este valor para el gasto en IA.
 */
export const AdminAiCostCard = () => {
  const [costUsd, setCostUsd] = useState<number | null>(null);
  const [usdPerMxn, setUsdPerMxn] = useState(0);
  const [loadFailed, setLoadFailed] = useState(false);
  const [draft, setDraft] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  useEffect(() => {
    let current = true;
    Promise.all([AdminRepository.getAiCostPerImage(), TokenPricingRepository.getExchangeRateMxnUsd()])
      .then(([cost, rate]) => {
        if (!current) return;
        if (cost == null) {
          setLoadFailed(true);
          return;
        }
        setCostUsd(cost);
        setDraft(aiCostDraft(cost));
        setUsdPerMxn(rate);
      })
      .catch(() => {
        if (current) setLoadFailed(true);
      });
    return () => {
      current = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cost = parseAiCostInput(draft);
    if (cost == null) {
      setStatus({ kind: 'error', text: 'Escribe un costo en dólares mayor que cero, con hasta seis decimales.' });
      return;
    }
    if (cost === costUsd) return;
    setIsSaving(true);
    setStatus(null);
    const saved = await AdminRepository.setAiCostPerImage(cost);
    setIsSaving(false);
    if (saved == null) {
      setStatus({ kind: 'error', text: 'No se pudo guardar el costo. Intenta de nuevo.' });
      return;
    }
    setCostUsd(saved);
    setDraft(aiCostDraft(saved));
    setStatus({ kind: 'ok', text: 'Guardado.' });
  };

  if (costUsd == null) {
    return (
      <div className="admin-pricing__card">
        <span className="admin-pricing__label">Costo de IA por imagen</span>
        {loadFailed ? (
          <p className="admin-pricing__error">No se pudo cargar el costo de IA por imagen.</p>
        ) : (
          <p className="admin-pricing__muted">Cargando…</p>
        )}
      </div>
    );
  }

  const typed = parseAiCostInput(draft);

  return (
    <form className="admin-pricing__card" onSubmit={handleSubmit}>
      <label htmlFor="admin-pricing-ai-cost" className="admin-pricing__label">
        Costo de IA por imagen
      </label>
      <div className="admin-pricing__row">
        <span className="admin-pricing__currency" aria-hidden="true">US$</span>
        <input
          id="admin-pricing-ai-cost"
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
        <span className="admin-pricing__muted">{aiCostPesosLabel(typed ?? costUsd, usdPerMxn)}</span>
        <button type="submit" className="admin-pricing__btn" disabled={isSaving || typed === costUsd}>
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
        Lo que te cobra Replicate por cada imagen (GPT-Image, calidad low). El Resumen usa este valor para calcular el
        gasto en IA.
      </p>
    </form>
  );
};
