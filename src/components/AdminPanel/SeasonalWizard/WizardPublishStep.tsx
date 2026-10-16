import type { SeasonalFormErrors, SeasonalLoteriaForm } from '../../../utils/seasonalLoteria';
import type { PublishCheck, WizardStepId } from '../../../utils/seasonalWizard';
import { ThemedCard, type ThemedCardLoteria } from '../../Seasonal/ThemedCard';
import { FieldError } from './WizardBasicsStep';

interface WizardPublishStepProps {
  form: SeasonalLoteriaForm;
  errors: SeasonalFormErrors;
  setField: <K extends keyof SeasonalLoteriaForm>(field: K, value: SeasonalLoteriaForm[K]) => void;
  checks: PublishCheck[];
  /** Lo que falta se completa en otro paso: tocarlo lleva ahí. */
  onGoToStep: (step: WizardStepId) => void;
  preview: ThemedCardLoteria;
  isPublished: boolean;
}

const DATE_FIELDS = [
  { field: 'validFrom', id: 'wizard-valid-from', label: 'Visible desde (opcional)' },
  { field: 'validUntil', id: 'wizard-valid-until', label: 'Visible hasta (opcional)' },
] as const;

/** Paso 5, Precio y publicación (FEAT-48, decisión 14): precio, fechas, lo que falta y la vista previa. */
export const WizardPublishStep = ({ form, errors, setField, checks, onGoToStep, preview, isPublished }: WizardPublishStepProps) => (
  <section className="seasonal-wizard__panel" aria-labelledby="wizard-step-title">
    <div>
      <h1 id="wizard-step-title" className="seasonal-wizard__step-title">
        Precio y publicación
      </h1>
      <p className="seasonal-wizard__muted">
        {isPublished ? 'Ya está en el catálogo: lo que cambies se guarda con «Guardar cambios».' : 'Último paso.'}
      </p>
    </div>

    <div className="seasonal-wizard__three-cols">
      <div className="seasonal-wizard__label">
        <label htmlFor="wizard-price">Precio (MXN, mínimo $10)</label>
        <input
          id="wizard-price"
          type="text"
          inputMode="decimal"
          className="seasonal-wizard__field"
          placeholder="90"
          value={form.price}
          aria-describedby={errors.price ? 'wizard-price-error' : undefined}
          onChange={(e) => setField('price', e.target.value)}
        />
        <FieldError id="wizard-price-error" message={errors.price} />
      </div>
      {DATE_FIELDS.map(({ field, id, label }) => (
        <div key={field} className="seasonal-wizard__label">
          <label htmlFor={id}>{label}</label>
          <input
            id={id}
            type="datetime-local"
            className="seasonal-wizard__field"
            value={form[field]}
            aria-describedby={errors[field] ? `${id}-error` : undefined}
            onChange={(e) => setField(field, e.target.value)}
          />
          <FieldError id={`${id}-error`} message={errors[field]} />
        </div>
      ))}
    </div>

    <div className="seasonal-wizard__publish">
      <div className="seasonal-wizard__checklist">
        <h2 className="seasonal-wizard__checklist-title">Lista para publicar</h2>
        <ul>
          {checks.map((check) => (
            <li key={check.id} className="seasonal-wizard__check">
              <span
                className={`seasonal-wizard__check-mark seasonal-wizard__check-mark--${check.ok ? 'ok' : 'missing'}`}
                role="img"
                aria-label={check.ok ? 'Listo' : 'Pendiente'}
              >
                {check.ok ? '✓' : '!'}
              </span>
              <span>{check.label}</span>
              {!check.ok && check.step !== 'publish' && (
                <button type="button" className="seasonal-wizard__link-btn" onClick={() => onGoToStep(check.step)}>
                  Completar
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="seasonal-wizard__preview">
        <span className="seasonal-wizard__muted seasonal-wizard__preview-title">Así se verá en el catálogo</span>
        <ThemedCard loteria={preview} linked={false} />
      </div>
    </div>
  </section>
);
