import { useEffect, useState } from 'react';
import { AdminRepository } from '../../repositories/AdminRepository';
import { TokenPricingRepository } from '../../repositories/TokenPricingRepository';
import { aiCostDraft, aiCostPesosLabel, parseAiCostInput } from '../../utils/adminPricing';

interface AiCostSetting {
  id: string;
  /** «Costo de IA por imagen», «Costo de la voz del cantador»… */
  label: string;
  help: string;
  load: () => Promise<number | null>;
  save: (costUsd: number) => Promise<number | null>;
}

/** Lo que cobra Replicate por cada imagen (FEAT-47, US A1). */
export const AI_COST_PER_IMAGE: AiCostSetting = {
  id: 'admin-pricing-ai-cost',
  label: 'Costo de IA por imagen',
  help: 'Lo que te cobra Replicate por cada imagen (GPT-Image, calidad low). El Resumen usa este valor para calcular el gasto en IA.',
  load: () => AdminRepository.getAiCostPerImage(),
  save: (cost) => AdminRepository.setAiCostPerImage(cost),
};

/** Lo que cobra Replicate por la voz con IA de una lotería del cantador (FEAT-55, decisión 28). */
export const AI_COST_PER_VOICE: AiCostSetting = {
  id: 'admin-pricing-voice-cost',
  label: 'Costo de la voz del cantador',
  help: 'Lo que te cobra Replicate por la voz con IA de una lotería (MiniMax, todas sus cartas). El Resumen usa este valor para calcular el gasto en IA.',
  load: () => AdminRepository.getAiCostPerVoice(),
  save: (cost) => AdminRepository.setAiCostPerVoice(cost),
};

/**
 * Un costo de IA de «Lo básico» (FEAT-47, US A1; FEAT-55): en US$, con su equivalente en pesos.
 * Sin confirmación al guardar (decisión 3). El Resumen usa estos valores para el gasto en IA.
 */
export const AdminAiCostCard = ({ setting }: { setting: AiCostSetting }) => {
  const [costUsd, setCostUsd] = useState<number | null>(null);
  const [usdPerMxn, setUsdPerMxn] = useState(0);
  const [loadFailed, setLoadFailed] = useState(false);
  const [draft, setDraft] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  useEffect(() => {
    let current = true;
    Promise.all([setting.load(), TokenPricingRepository.getExchangeRateMxnUsd()])
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
  }, [setting]);

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
    const saved = await setting.save(cost);
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
        <span className="admin-pricing__label">{setting.label}</span>
        {loadFailed ? (
          <p className="admin-pricing__error">No se pudo cargar este costo.</p>
        ) : (
          <p className="admin-pricing__muted">Cargando…</p>
        )}
      </div>
    );
  }

  const typed = parseAiCostInput(draft);

  return (
    <form className="admin-pricing__card" onSubmit={handleSubmit}>
      <label htmlFor={setting.id} className="admin-pricing__label">
        {setting.label}
      </label>
      <div className="admin-pricing__row">
        <span className="admin-pricing__currency" aria-hidden="true">US$</span>
        <input
          id={setting.id}
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
      <p className="admin-pricing__muted">{setting.help}</p>
    </form>
  );
};
