import { useState } from 'react';
import { SeasonalRepository, SEASON_NAME_MAX_LENGTH, type Season } from '../../../repositories/SeasonalRepository';
import {
  SEASONAL_DESCRIPTION_MAX_LENGTH,
  SEASONAL_NAME_MAX_LENGTH,
  type SeasonalFormErrors,
  type SeasonalGridSize,
  type SeasonalLoteriaForm,
} from '../../../utils/seasonalLoteria';

const NEW_SEASON = '__nueva__';

const MODES: { gridSize: SeasonalGridSize; title: string; detail: string }[] = [
  { gridSize: 16, title: 'Clásico', detail: 'Tableros de 4 × 4 · mínimo 24 cartas, hasta 54' },
  { gridSize: 9, title: 'Kids', detail: 'Tableros de 3 × 3 · desde 9 cartas' },
];

interface WizardBasicsStepProps {
  form: SeasonalLoteriaForm;
  errors: SeasonalFormErrors;
  seasons: readonly Season[];
  setField: <K extends keyof SeasonalLoteriaForm>(field: K, value: SeasonalLoteriaForm[K]) => void;
  onSeasonCreated: (season: Season) => void;
}

export const FieldError = ({ id, message }: { id: string; message?: string }) =>
  message ? (
    <span className="seasonal-wizard__field-error" id={id}>
      {message}
    </span>
  ) : null;

/** Paso 1 del asistente (FEAT-48, decisión 10): temática, nombre, modo, descripción y versión en inglés. */
export const WizardBasicsStep = ({ form, errors, seasons, setField, onSeasonCreated }: WizardBasicsStepProps) => {
  const [creating, setCreating] = useState(false);
  const [newSeason, setNewSeason] = useState('');
  const [seasonError, setSeasonError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showEnglish, setShowEnglish] = useState(form.nameEn !== '' || form.descriptionEn !== '');

  const createSeason = async () => {
    if (newSeason.trim() === '') {
      setSeasonError('Escribe el nombre de la temática nueva.');
      return;
    }
    setIsCreating(true);
    setSeasonError(null);
    const sortOrder = seasons.reduce((max, season) => Math.max(max, season.sort_order + 1), 0);
    const created = await SeasonalRepository.createSeason({ name_es: newSeason, name_en: null, sort_order: sortOrder });
    setIsCreating(false);
    if (!created) {
      setSeasonError('No se pudo crear la temática. Intenta de nuevo.');
      return;
    }
    onSeasonCreated(created);
    setField('seasonId', created.id);
    setCreating(false);
    setNewSeason('');
  };

  return (
    <section className="seasonal-wizard__panel" aria-labelledby="wizard-step-title">
      <div>
        <h1 id="wizard-step-title" className="seasonal-wizard__step-title">
          Lo básico
        </h1>
        <p className="seasonal-wizard__muted">Cómo se llama y para quién es.</p>
      </div>

      <div className="seasonal-wizard__two-cols">
        <div className="seasonal-wizard__label">
          <label htmlFor="wizard-season">Temática</label>
          <select
            id="wizard-season"
            className="seasonal-wizard__field"
            value={creating ? NEW_SEASON : form.seasonId}
            aria-describedby={errors.seasonId ? 'wizard-season-error' : undefined}
            onChange={(e) => {
              const isNew = e.target.value === NEW_SEASON;
              setCreating(isNew);
              setSeasonError(null);
              if (!isNew) setField('seasonId', e.target.value);
            }}
          >
            <option value="" disabled>
              Elige una temática
            </option>
            {seasons.map((season) => (
              <option key={season.id} value={season.id}>
                {season.name_es}
              </option>
            ))}
            <option value={NEW_SEASON}>+ Crear temática nueva…</option>
          </select>
          <FieldError id="wizard-season-error" message={errors.seasonId} />
          {creating && (
            <div className="seasonal-wizard__inline-create">
              <input
                type="text"
                className="seasonal-wizard__field"
                aria-label="Nombre de la temática nueva"
                placeholder="Nombre de la temática nueva"
                maxLength={SEASON_NAME_MAX_LENGTH}
                value={newSeason}
                onChange={(e) => setNewSeason(e.target.value)}
                autoFocus
              />
              <button type="button" className="seasonal-wizard__btn" onClick={createSeason} disabled={isCreating}>
                {isCreating ? 'Creando…' : 'Crear'}
              </button>
              {seasonError && <span className="seasonal-wizard__field-error">{seasonError}</span>}
            </div>
          )}
        </div>

        <div className="seasonal-wizard__label">
          <label htmlFor="wizard-name">Nombre</label>
          <input
            id="wizard-name"
            type="text"
            className="seasonal-wizard__field"
            maxLength={SEASONAL_NAME_MAX_LENGTH}
            value={form.nameEs}
            aria-describedby={errors.nameEs ? 'wizard-name-error' : undefined}
            onChange={(e) => setField('nameEs', e.target.value)}
          />
          <FieldError id="wizard-name-error" message={errors.nameEs} />
        </div>
      </div>

      <fieldset className="seasonal-wizard__label seasonal-wizard__fieldset">
        <legend>Modo</legend>
        <div className="seasonal-wizard__choices">
          {MODES.map((mode) => (
            <button
              key={mode.gridSize}
              type="button"
              className={`seasonal-wizard__choice${form.gridSize === mode.gridSize ? ' seasonal-wizard__choice--on' : ''}`}
              aria-pressed={form.gridSize === mode.gridSize}
              onClick={() => setField('gridSize', mode.gridSize)}
            >
              <b>{mode.title}</b>
              <span className="seasonal-wizard__muted">{mode.detail}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <div className="seasonal-wizard__label">
        <label htmlFor="wizard-description">Descripción</label>
        <textarea
          id="wizard-description"
          className="seasonal-wizard__field seasonal-wizard__textarea"
          rows={3}
          maxLength={SEASONAL_DESCRIPTION_MAX_LENGTH}
          value={form.descriptionEs}
          aria-describedby={errors.descriptionEs ? 'wizard-description-error' : undefined}
          onChange={(e) => setField('descriptionEs', e.target.value)}
        />
        <FieldError id="wizard-description-error" message={errors.descriptionEs} />
      </div>

      <details open={showEnglish} onToggle={(e) => setShowEnglish(e.currentTarget.open)}>
        <summary className="seasonal-wizard__summary">+ Agregar versión en inglés (opcional)</summary>
        <div className="seasonal-wizard__english">
          <div className="seasonal-wizard__label">
            <label htmlFor="wizard-name-en">Nombre en inglés</label>
            <input
              id="wizard-name-en"
              type="text"
              className="seasonal-wizard__field"
              maxLength={SEASONAL_NAME_MAX_LENGTH}
              value={form.nameEn}
              placeholder={form.nameEs}
              onChange={(e) => setField('nameEn', e.target.value)}
            />
            <FieldError id="wizard-name-en-error" message={errors.nameEn} />
          </div>
          <div className="seasonal-wizard__label">
            <label htmlFor="wizard-description-en">Descripción en inglés</label>
            <textarea
              id="wizard-description-en"
              className="seasonal-wizard__field seasonal-wizard__textarea"
              rows={2}
              maxLength={SEASONAL_DESCRIPTION_MAX_LENGTH}
              value={form.descriptionEn}
              onChange={(e) => setField('descriptionEn', e.target.value)}
            />
            <FieldError id="wizard-description-en-error" message={errors.descriptionEn} />
          </div>
        </div>
      </details>
    </section>
  );
};
