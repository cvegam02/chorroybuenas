import { FaArrowLeft } from 'react-icons/fa';
import { savedAgoLabel, type WizardStep } from '../../../utils/seasonalWizard';
import type { DraftSaveState } from './useWizardDraft';
import { BusyLabel, Spinner } from './WizardBusy';

function saveLabel(state: DraftSaveState, isPublished: boolean, now: Date): string {
  if (isPublished) return 'Publicada: los cambios se guardan con «Guardar cambios»';
  switch (state.kind) {
    case 'saving':
      return 'Guardando…';
    case 'saved':
      return `Guardado automáticamente ${savedAgoLabel(state.at, now)}`;
    case 'invalid':
      return 'Sin guardar: revisa los campos marcados';
    case 'failed':
      return 'No se pudo guardar. Revisa tu conexión.';
    case 'idle':
      return 'Se guarda solo al cambiar de paso';
  }
}

interface WizardHeaderProps {
  name: string;
  isPublished: boolean;
  saveState: DraftSaveState;
  now: Date;
  onBack: () => void;
}

/** Arriba del asistente (FEAT-48, decisión 7): volver, título, estado y el aviso de guardado. */
export const WizardHeader = ({ name, isPublished, saveState, now, onBack }: WizardHeaderProps) => (
  <header className="seasonal-wizard__top">
    <div className="seasonal-wizard__top-title">
      <button type="button" className="seasonal-wizard__icon-btn" aria-label="Volver a Temáticas" onClick={onBack}>
        <FaArrowLeft aria-hidden="true" />
      </button>
      <div>
        <div className="seasonal-wizard__title">{isPublished ? 'Editar lotería temática' : 'Nueva lotería temática'}</div>
        <div className="seasonal-wizard__muted">
          {name} · {isPublished ? 'Publicada' : 'Borrador (aún no se ve en el catálogo)'}
        </div>
      </div>
    </div>
    <span className="seasonal-wizard__saved" role="status">
      {saveState.kind === 'saving' ? (
        <Spinner inline />
      ) : (
        <span
          className={`seasonal-wizard__dot${saveState.kind === 'failed' || saveState.kind === 'invalid' ? ' seasonal-wizard__dot--off' : ''}`}
          aria-hidden="true"
        />
      )}
      {saveLabel(saveState, isPublished, now)}
    </span>
  </header>
);

interface WizardStepsNavProps {
  steps: WizardStep[];
  current: number;
  onGo: (index: number) => void;
}

/** Los cinco pasos (decisión 8): ✓ verde los terminados, naranja el actual; se puede tocar cualquiera. */
export const WizardStepsNav = ({ steps, current, onGo }: WizardStepsNavProps) => (
  <nav aria-label="Pasos" className="seasonal-wizard__steps">
    {steps.map((item, index) => {
      const isCurrent = index === current;
      const state = isCurrent ? 'current' : item.done ? 'done' : 'todo';
      return (
        <button
          key={item.id}
          type="button"
          className="seasonal-wizard__step"
          aria-current={isCurrent ? 'step' : undefined}
          onClick={() => onGo(index)}
        >
          <span className={`seasonal-wizard__num seasonal-wizard__num--${state}`} aria-hidden="true">
            {item.done && !isCurrent ? '✓' : String(index + 1)}
          </span>
          <span>
            <span className="seasonal-wizard__step-name">{item.title}</span>
            <span className="seasonal-wizard__muted">{item.description}</span>
          </span>
        </button>
      );
    })}
  </nav>
);

interface WizardFooterProps {
  isFirst: boolean;
  isLast: boolean;
  isPublished: boolean;
  busy: boolean;
  /** Todo en ✓ en «Lista para publicar»: solo así se publica o se guarda una publicada. */
  isReady: boolean;
  onPrev: () => void;
  onNext: () => void;
  onSaveDraft: () => void;
  onPublish: () => void;
  onSaveChanges: () => void;
}

/** «← Anterior» y «Siguiente →»; en el último paso, «Guardar sin publicar» y «Publicar», o «Guardar cambios». */
export const WizardFooter = ({
  isFirst,
  isLast,
  isPublished,
  busy,
  isReady,
  onPrev,
  onNext,
  onSaveDraft,
  onPublish,
  onSaveChanges,
}: WizardFooterProps) => (
  <div className="seasonal-wizard__footer">
    <button type="button" className="seasonal-wizard__btn" onClick={onPrev} disabled={isFirst || busy}>
      ← Anterior
    </button>
    <div className="seasonal-wizard__footer-end">
      {isLast && isPublished && (
        <button
          type="button"
          className="seasonal-wizard__btn seasonal-wizard__btn--primary"
          onClick={onSaveChanges}
          disabled={busy || !isReady}
          title={isReady ? undefined : 'Una lotería publicada no puede quedarse sin lo que marca la lista'}
        >
          <BusyLabel busy={busy} text="Guardar cambios" />
        </button>
      )}
      {isLast && !isPublished && (
        <>
          <button type="button" className="seasonal-wizard__btn" onClick={onSaveDraft} disabled={busy}>
            Guardar sin publicar
          </button>
          <button
            type="button"
            className="seasonal-wizard__btn seasonal-wizard__btn--primary"
            onClick={onPublish}
            disabled={busy || !isReady}
            title={isReady ? undefined : 'Completa lo que marca «Lista para publicar»'}
          >
            <BusyLabel busy={busy} text="Publicar" />
          </button>
        </>
      )}
      {!isLast && (
        <button type="button" className="seasonal-wizard__btn seasonal-wizard__btn--primary" onClick={onNext} disabled={busy}>
          <BusyLabel busy={busy} text="Siguiente →" />
        </button>
      )}
    </div>
  </div>
);
