import { useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AUTO_RHYTHMS,
  type AutoRhythm,
  CUSTOM_LIMITS,
  type CustomRhythm,
  clampCustomRhythm,
  parseRhythm,
} from '../../utils/callerAuto';

interface SecondsFieldProps {
  label: string;
  field: 'gapSeconds' | 'pauseSeconds';
  custom: CustomRhythm;
  disabled?: boolean;
  onChange: (custom: CustomRhythm) => void;
}

/** Un campo de segundos del personalizado: se escribe libre y, al salir, se queda dentro de sus límites. */
const SecondsField = ({ label, field, custom, disabled = false, onChange }: SecondsFieldProps) => {
  const { t } = useTranslation();
  const inputId = useId();
  const value = custom[field];
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);

  const commit = () => {
    // Vacío se queda como estaba; fuera de límites, en el límite (decisión 3)
    const typed = draft.trim() === '' ? value : Number(draft);
    const clamped = clampCustomRhythm({ ...custom, [field]: typed });
    setDraft(String(clamped[field]));
    if (clamped[field] !== value) onChange(clamped);
  };

  return (
    <>
      <label htmlFor={inputId} className="caller__custom-label">
        {label}
      </label>
      <span className="caller__custom-control">
        <input
          id={inputId}
          type="number"
          inputMode="numeric"
          className="caller__auto-select caller__custom-input"
          min={CUSTOM_LIMITS[field].min}
          max={CUSTOM_LIMITS[field].max}
          value={draft}
          disabled={disabled}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
          }}
        />
        {t('caller.customSeconds')}
      </span>
    </>
  );
};

interface CallerRhythmPickerProps {
  rhythm: AutoRhythm;
  onChange: (rhythm: AutoRhythm) => void;
  custom: CustomRhythm;
  onCustomChange: (custom: CustomRhythm) => void;
}

const PAUSE_EVERY_OPTIONS = [0, 2, 3, 4, 5, 6, 7, 8, 9, 10];

/** El ritmo del automático (FEAT-55, US A5, decisión 16), personalizado (FEAT-59, US A3) o manual (FEAT-59, US A2). */
export const CallerRhythmPicker = ({ rhythm, onChange, custom, onCustomChange }: CallerRhythmPickerProps) => {
  const { t } = useTranslation();
  const selectId = useId();
  const everyId = useId();

  const rhythmLabel = (value: AutoRhythm) => {
    if (value === 'traditional') return t('caller.rhythmTraditional');
    if (value === 'custom') return t('caller.rhythmCustom');
    if (value === 'manual') return t('caller.rhythmManual');
    return t('caller.rhythmEvery', { seconds: value });
  };

  return (
    <>
      <div className="caller__auto">
        <label htmlFor={selectId} className="caller__auto-label">
          {t('caller.rhythm')}
        </label>
        <select id={selectId} className="caller__auto-select" value={rhythm} onChange={(e) => onChange(parseRhythm(e.target.value))}>
          {AUTO_RHYTHMS.map((value) => (
            <option key={value} value={value}>
              {rhythmLabel(value)}
            </option>
          ))}
        </select>
      </div>
      {rhythm === 'custom' && (
        <div className="caller__custom">
          <SecondsField label={t('caller.customGap')} field="gapSeconds" custom={custom} onChange={onCustomChange} />
          <label htmlFor={everyId} className="caller__custom-label">
            {t('caller.customEvery')}
          </label>
          <span className="caller__custom-control">
            <select
              id={everyId}
              className="caller__auto-select"
              value={custom.pauseEvery}
              onChange={(e) => onCustomChange(clampCustomRhythm({ ...custom, pauseEvery: Number(e.target.value) }))}
            >
              {PAUSE_EVERY_OPTIONS.map((count) => (
                <option key={count} value={count}>
                  {count === 0 ? t('caller.customNever') : t('caller.customCards', { count })}
                </option>
              ))}
            </select>
          </span>
          <SecondsField
            label={t('caller.customPause')}
            field="pauseSeconds"
            custom={custom}
            disabled={custom.pauseEvery === 0}
            onChange={onCustomChange}
          />
        </div>
      )}
    </>
  );
};
