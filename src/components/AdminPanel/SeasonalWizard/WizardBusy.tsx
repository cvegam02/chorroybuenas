/**
 * Lo que se mueve mientras el asistente de temáticas trabaja (FEAT-50, US A5): el círculo que gira, la
 * línea «Cargando…» y la barra de avance, con los estilos que el sitio ya usa en Crear y en el PDF.
 */
import './WizardBusy.css';

/** Círculo que gira; `inline` para dentro de un botón o junto a un texto. */
export const Spinner = ({ inline = false }: { inline?: boolean }) => (
  <span className={`wizard-busy__spinner${inline ? ' wizard-busy__spinner--inline' : ''}`} aria-hidden="true" />
);

/** «Cargando…» con su círculo, anunciado a quien usa lector de pantalla. */
export const LoadingLine = ({ text }: { text: string }) => (
  <p className="wizard-busy__line" role="status">
    <Spinner inline />
    {text}
  </p>
);

/** El texto de un botón y, mientras trabaja, el círculo a su lado. */
export const BusyLabel = ({ busy, text }: { busy: boolean; text: string }) => (
  <span className="wizard-busy__label">
    {busy && <Spinner inline />}
    {text}
  </span>
);

interface ProgressBarProps {
  label: string;
  /** Sin `total`, la barra va y viene: se sabe que trabaja, no cuánto falta. */
  done?: number;
  total?: number;
}

export const ProgressBar = ({ label, done = 0, total }: ProgressBarProps) => {
  const known = total !== undefined && total > 0;
  const percent = known ? Math.min(100, Math.round((done / total) * 100)) : 0;
  return (
    <div className="wizard-busy__progress" role="status">
      <span className="wizard-busy__progress-label">
        {label}
        {known && ` · ${done} de ${total}`}
      </span>
      <div
        className="wizard-busy__bar"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={known ? total : undefined}
        aria-valuenow={known ? done : undefined}
      >
        <div
          className={`wizard-busy__bar-fill${known ? '' : ' wizard-busy__bar-fill--unknown'}`}
          style={known ? { width: `${percent}%` } : undefined}
        />
      </div>
    </div>
  );
};
