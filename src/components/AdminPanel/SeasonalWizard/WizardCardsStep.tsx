import type { ReactNode } from 'react';

export type CardsMode = 'cards' | 'pdf';

const MODES: { mode: CardsMode; title: string; detail: string }[] = [
  {
    mode: 'cards',
    title: 'Subir mis cartas',
    detail: 'Sube las imágenes y el sitio arma el PDF, los tableros y las muestras. Recomendado.',
  },
  { mode: 'pdf', title: 'Ya tengo el PDF', detail: 'Sube el PDF terminado e indica cuántas cartas y tableros trae.' },
];

interface WizardCardsStepProps {
  mode: CardsMode;
  onModeChange: (mode: CardsMode) => void;
  /** false mientras la lotería no se haya guardado: sin ella no hay dónde subir. */
  canUpload: boolean;
  children: ReactNode;
}

/** Paso 2 del asistente (FEAT-48, decisión 11): cómo se arma la lotería, y sus cartas o su PDF. */
export const WizardCardsStep = ({ mode, onModeChange, canUpload, children }: WizardCardsStepProps) => (
  <section className="seasonal-wizard__panel" aria-labelledby="wizard-step-title">
    <div>
      <h1 id="wizard-step-title" className="seasonal-wizard__step-title">
        Cartas
      </h1>
      <p className="seasonal-wizard__muted">¿Cómo quieres armarla?</p>
    </div>
    <div className="seasonal-wizard__choices">
      {MODES.map((item) => (
        <button
          key={item.mode}
          type="button"
          className={`seasonal-wizard__choice${mode === item.mode ? ' seasonal-wizard__choice--on' : ''}`}
          aria-pressed={mode === item.mode}
          onClick={() => onModeChange(item.mode)}
        >
          <b>{item.title}</b>
          <span className="seasonal-wizard__muted">{item.detail}</span>
        </button>
      ))}
    </div>
    {canUpload ? (
      children
    ) : (
      <p className="seasonal-wizard__muted">Primero elige la temática y escribe el nombre en «Lo básico».</p>
    )}
  </section>
);
