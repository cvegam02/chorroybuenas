import { useEffect, useState } from 'react';
import { AdminRepository } from '../../repositories/AdminRepository';
import { TokenPricingRepository } from '../../repositories/TokenPricingRepository';
import {
  customPeriod,
  MAX_CHART_DAYS,
  periodDays,
  previousPeriod,
  summaryPeriod,
  type SummaryPeriod,
  type SummaryPeriodChoice,
} from '../../utils/adminSummary';
import { SummarySections, type SummaryData, type SummaryTargetTab } from './AdminSummarySections';
import { SummaryChart } from './AdminSummaryChart';
import { SummaryPending } from './AdminSummaryPending';
import './AdminSummary.css';

const PERIOD_OPTIONS: { id: SummaryPeriodChoice; label: string }[] = [
  { id: 'today', label: 'Hoy' },
  { id: 'week', label: 'Semana' },
  { id: 'month', label: 'Este mes' },
  { id: 'year', label: 'Año' },
  { id: 'range', label: 'Rango…' },
];

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

/** El periodo que se está mostrando y cómo se eligió, que decide con qué se compara. */
interface Selection {
  kind: SummaryPeriodChoice;
  period: SummaryPeriod;
}

interface AdminSummaryProps {
  onOpenTab: (tab: SummaryTargetTab) => void;
}

export const AdminSummary = ({ onOpenTab }: AdminSummaryProps) => {
  const [choice, setChoice] = useState<SummaryPeriodChoice>('month');
  const [selection, setSelection] = useState<Selection>(() => ({ kind: 'month', period: summaryPeriod('month') }));
  const [rangeInputs, setRangeInputs] = useState({ from: '', to: '' });
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const previous = previousPeriod(selection.kind, selection.period);

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
    ])
      .then(([totals, previousTotals, daily, pending, usdPerMxn]) => {
        if (!current) return;
        if (totals && previousTotals && pending && (daily || !chartFits)) {
          setData({ totals, previous: previousTotals, daily, pending, usdPerMxn });
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

  const choosePeriod = (kind: SummaryPeriodChoice) => {
    setChoice(kind);
    if (kind !== 'range') setSelection({ kind, period: summaryPeriod(kind) });
  };

  const customRange = customPeriod(rangeInputs.from, rangeInputs.to);

  return (
    <div className="admin-summary">
      <header className="admin-summary__header">
        <div>
          <h2 className="admin-summary__title">Resumen</h2>
          <p className="admin-summary__subtitle">
            {describePeriod(selection.period)} · comparado con {describePeriod(previous)}
          </p>
        </div>
        <div className="admin-summary__periods" role="group" aria-label="Periodo">
          {PERIOD_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              className={`admin-summary__period${choice === option.id ? ' admin-summary__period--active' : ''}`}
              aria-pressed={choice === option.id}
              onClick={() => choosePeriod(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </header>

      {choice === 'range' && (
        <form
          className="admin-summary__range"
          onSubmit={(e) => {
            e.preventDefault();
            if (customRange) setSelection({ kind: 'range', period: customRange });
          }}
        >
          <label className="admin-summary__range-field">
            Desde
            <input
              type="date"
              value={rangeInputs.from}
              onChange={(e) => setRangeInputs((r) => ({ ...r, from: e.target.value }))}
            />
          </label>
          <label className="admin-summary__range-field">
            Hasta
            <input
              type="date"
              value={rangeInputs.to}
              onChange={(e) => setRangeInputs((r) => ({ ...r, to: e.target.value }))}
            />
          </label>
          <button type="submit" className="admin-summary__range-apply" disabled={!customRange}>
            Ver
          </button>
        </form>
      )}

      {failed ? (
        <div className="admin-summary__error" role="alert">
          <p>No se pudo cargar el resumen.</p>
          <button type="button" className="admin-summary__range-apply" onClick={() => setAttempt((n) => n + 1)}>
            Reintentar
          </button>
        </div>
      ) : (
        <>
          <SummarySections data={data} loading={loading} onOpenTab={onOpenTab} />
          <SummaryChart
            daily={loading || !data ? undefined : data.daily}
            usdPerMxn={data?.usdPerMxn ?? 0}
          />
          <SummaryPending pending={loading ? null : data?.pending ?? null} onOpenTab={onOpenTab} />
        </>
      )}
    </div>
  );
};
