import { useState } from 'react';
import {
  customPeriod,
  summaryPeriod,
  type SummaryPeriod,
  type SummaryPeriodChoice,
} from '../../utils/adminSummary';
import './AdminPeriodPicker.css';

const PERIOD_OPTIONS: { id: SummaryPeriodChoice; label: string }[] = [
  { id: 'today', label: 'Hoy' },
  { id: 'week', label: 'Semana' },
  { id: 'month', label: 'Este mes' },
  { id: 'year', label: 'Año' },
  { id: 'range', label: 'Rango…' },
];

/** El periodo que se está mostrando y cómo se eligió, que decide con qué se compara. */
export interface PeriodSelection {
  kind: SummaryPeriodChoice;
  period: SummaryPeriod;
}

/** Al abrir, «Este mes» (FEAT-43, decisión 3). */
export const defaultPeriodSelection = (): PeriodSelection => ({ kind: 'month', period: summaryPeriod('month') });

interface AdminPeriodPickerProps {
  value: PeriodSelection;
  onChange: (selection: PeriodSelection) => void;
}

/** Hoy, semana, este mes, año o un rango a mano, en días de Hermosillo. */
export const AdminPeriodPicker = ({ value, onChange }: AdminPeriodPickerProps) => {
  // «Rango…» se marca al tocarlo, pero el periodo solo cambia al pulsar «Ver».
  const [choice, setChoice] = useState<SummaryPeriodChoice>(value.kind);
  const [rangeInputs, setRangeInputs] = useState(() =>
    value.kind === 'range' ? { from: value.period.from, to: value.period.to } : { from: '', to: '' },
  );

  const choosePeriod = (kind: SummaryPeriodChoice) => {
    setChoice(kind);
    if (kind !== 'range') onChange({ kind, period: summaryPeriod(kind) });
  };

  const customRange = customPeriod(rangeInputs.from, rangeInputs.to);

  return (
    <div className="admin-period">
      <div className="admin-period__options" role="group" aria-label="Periodo">
        {PERIOD_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            className={`admin-period__option${choice === option.id ? ' admin-period__option--active' : ''}`}
            aria-pressed={choice === option.id}
            onClick={() => choosePeriod(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {choice === 'range' && (
        <form
          className="admin-period__range"
          onSubmit={(e) => {
            e.preventDefault();
            if (customRange) onChange({ kind: 'range', period: customRange });
          }}
        >
          <label className="admin-period__range-field">
            Desde
            <input
              type="date"
              value={rangeInputs.from}
              onChange={(e) => setRangeInputs((r) => ({ ...r, from: e.target.value }))}
            />
          </label>
          <label className="admin-period__range-field">
            Hasta
            <input
              type="date"
              value={rangeInputs.to}
              onChange={(e) => setRangeInputs((r) => ({ ...r, to: e.target.value }))}
            />
          </label>
          <button type="submit" className="admin-period__range-apply" disabled={!customRange}>
            Ver
          </button>
        </form>
      )}
    </div>
  );
};
