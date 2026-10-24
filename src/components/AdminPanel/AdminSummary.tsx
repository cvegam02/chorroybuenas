import { useEffect, useState } from 'react';
import { AdminRepository } from '../../repositories/AdminRepository';
import { OfferRepository } from '../../repositories/OfferRepository';
import { TokenPricingRepository } from '../../repositories/TokenPricingRepository';
import { MAX_CHART_DAYS, periodDays, previousPeriod, type AiCosts, type SummaryPeriod } from '../../utils/adminSummary';

/** Mientras carga, la gráfica no dibuja gasto en IA. */
const NO_AI_COSTS: AiCosts = { perImageUsd: 0, perVoiceUsd: 0 };
import { AdminPeriodPicker, defaultPeriodSelection, type PeriodSelection } from './AdminPeriodPicker';
import type { SalesPreset } from './AdminSales';
import {
  SummarySections,
  type SummaryData,
  type SummarySalesFilter,
  type SummaryTargetTab,
} from './AdminSummarySections';
import { SummaryChart } from './AdminSummaryChart';
import { SummaryPending } from './AdminSummaryPending';
import './AdminSummary.css';

// Las fechas del periodo son días de Hermosillo: se muestran tal cual, sin pasar por la hora del navegador.
const formatDay = (day: string) =>
  new Date(`${day}T12:00:00Z`).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });

const describePeriod = (period: SummaryPeriod) =>
  period.from === period.to ? formatDay(period.from) : `${formatDay(period.from)} – ${formatDay(period.to)}`;

interface AdminSummaryProps {
  /** Ventas se abre con el filtro de la tarjeta y, si no trae otro, el mismo periodo (US A5). */
  onOpenTab: (tab: Exclude<SummaryTargetTab, 'regalos'>, sales?: SalesPreset) => void;
  /** «Ver regalos» abre Regalos de tokens con el mismo periodo (FEAT-45, US A4). */
  onOpenGifts: (selection: PeriodSelection) => void;
}

export const AdminSummary = ({ onOpenTab, onOpenGifts }: AdminSummaryProps) => {
  const [selection, setSelection] = useState<PeriodSelection>(defaultPeriodSelection);
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const previous = previousPeriod(selection.kind, selection.period);

  const openTab = (tab: SummaryTargetTab, sales?: SummarySalesFilter) =>
    tab === 'regalos'
      ? onOpenGifts(selection)
      : onOpenTab(
          tab,
          tab === 'ventas'
            ? { selection: sales?.selection ?? selection, kind: sales?.kind ?? '', status: sales?.status ?? '' }
            : undefined,
        );

  useEffect(() => {
    let current = true;
    setLoading(true);
    setFailed(false);
    const chartFits = periodDays(selection.period) <= MAX_CHART_DAYS;
    Promise.all([
      AdminRepository.getDashboardSummary(selection.period),
      AdminRepository.getDashboardSummary(previousPeriod(selection.kind, selection.period)),
      chartFits ? AdminRepository.getDashboardDaily(selection.period) : Promise.resolve(null),
      AdminRepository.getDashboardPending(selection.period),
      TokenPricingRepository.getExchangeRateMxnUsd(),
      AdminRepository.getAiCostPerImage(),
      OfferRepository.getOfferSalesTotal(selection.period),
      AdminRepository.getAiCostPerVoice(),
    ])
      .then(([totals, previousTotals, daily, pending, usdPerMxn, perImageUsd, offerSales, perVoiceUsd]) => {
        if (!current) return;
        if (totals && previousTotals && pending && perImageUsd != null && perVoiceUsd != null && (daily || !chartFits)) {
          const aiCosts = { perImageUsd, perVoiceUsd };
          setData({ totals, previous: previousTotals, daily, pending, usdPerMxn, aiCosts, offerSales });
        } else {
          setFailed(true);
        }
      })
      .catch(() => {
        if (current) setFailed(true);
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [selection, attempt]);

  return (
    <div className="admin-summary">
      <header className="admin-summary__header">
        <div>
          <h2 className="admin-summary__title">Resumen</h2>
          <p className="admin-summary__subtitle">
            {describePeriod(selection.period)} · comparado con {describePeriod(previous)}
          </p>
        </div>
        <AdminPeriodPicker value={selection} onChange={setSelection} />
      </header>

      {failed ? (
        <div className="admin-summary__error" role="alert">
          <p>No se pudo cargar el resumen.</p>
          <button type="button" className="admin-summary__retry" onClick={() => setAttempt((n) => n + 1)}>
            Reintentar
          </button>
        </div>
      ) : (
        <>
          <SummarySections data={data} loading={loading} onOpenTab={openTab} />
          <SummaryChart
            daily={loading || !data ? undefined : data.daily}
            usdPerMxn={data?.usdPerMxn ?? 0}
            aiCosts={data?.aiCosts ?? NO_AI_COSTS}
          />
          <SummaryPending pending={loading ? null : data?.pending ?? null} onOpenTab={openTab} />
        </>
      )}
    </div>
  );
};
