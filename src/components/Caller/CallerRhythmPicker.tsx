import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { AUTO_RHYTHMS, type AutoRhythm, parseRhythm } from '../../utils/callerAuto';

interface CallerRhythmPickerProps {
  rhythm: AutoRhythm;
  onChange: (rhythm: AutoRhythm) => void;
}

/** El ritmo del automático (FEAT-55, US A5, decisión 16). */
export const CallerRhythmPicker = ({ rhythm, onChange }: CallerRhythmPickerProps) => {
  const { t } = useTranslation();
  const selectId = useId();

  return (
    <div className="caller__auto">
      <label htmlFor={selectId} className="caller__auto-label">
        {t('caller.rhythm')}
      </label>
      <select id={selectId} className="caller__auto-select" value={rhythm} onChange={(e) => onChange(parseRhythm(e.target.value))}>
        {AUTO_RHYTHMS.map((value) => (
          <option key={value} value={value}>
            {value === 'traditional' ? t('caller.rhythmTraditional') : t('caller.rhythmEvery', { seconds: value })}
          </option>
        ))}
      </select>
    </div>
  );
};
