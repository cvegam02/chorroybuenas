import { useState } from 'react';
import {
  defaultInputSource,
  parseCardList,
  traditionalCardList,
  type AiCardListError,
  type AiCardText,
  type AiInputSource,
} from '../../../utils/aiCardList';
import { WarningModal } from '../../ConfirmationModal/WarningModal';

interface WizardAiListLoaderProps {
  /** Hay cartas generadas: cambiar la lista las borra, así que se pide confirmar. */
  hasAttempts: boolean;
  isSaving: boolean;
  onLoad: (texts: readonly AiCardText[], source: AiInputSource) => Promise<boolean>;
  /** Con una lista ya cargada, cierra el cuadro sin cambiar nada. */
  onCancel?: () => void;
}

interface Pending {
  texts: AiCardText[];
  source: AiInputSource;
}

const EXAMPLE = '1 | EL GALLO | un gallo con bufanda roja cantando sobre un trineo\n6 | LA SIRENA | una sirena con gorro de Santa…';

/** «Cargar lista» o «Usar baraja tradicional» (FEAT-50, decisiones 4 y 6). */
export const WizardAiListLoader = ({ hasAttempts, isSaving, onLoad, onCancel }: WizardAiListLoaderProps) => {
  const [text, setText] = useState('');
  const [errors, setErrors] = useState<AiCardListError[]>([]);
  const [pending, setPending] = useState<Pending | null>(null);

  const submit = async (next: Pending) => {
    setPending(null);
    if (await onLoad(next.texts, next.source)) setText('');
  };

  const request = (next: Pending) => (hasAttempts ? setPending(next) : void submit(next));

  const loadPasted = () => {
    const { cards, errors: found } = parseCardList(text);
    setErrors(found);
    if (found.length > 0 || cards.length === 0) return;
    request({ texts: cards, source: defaultInputSource(cards) });
  };

  return (
    <div className="wizard-ai__loader">
      <div className="seasonal-wizard__label">
        <label htmlFor="wizard-ai-list">Pega tus cartas, una por renglón: número | NOMBRE | escena</label>
        <textarea
          id="wizard-ai-list"
          className="seasonal-wizard__field seasonal-wizard__textarea wizard-ai__list-field"
          rows={6}
          value={text}
          placeholder={EXAMPLE}
          aria-describedby={errors.length > 0 ? 'wizard-ai-list-errors' : undefined}
          onChange={(e) => setText(e.target.value)}
        />
      </div>
      {errors.length > 0 && (
        <ul id="wizard-ai-list-errors" className="wizard-ai__list-errors" role="alert">
          {errors.map((error) => (
            <li key={error.line}>
              Renglón {error.line}: {error.reason} — «{error.text}»
            </li>
          ))}
        </ul>
      )}
      <div className="wizard-ai__loader-actions">
        <button type="button" className="seasonal-wizard__btn seasonal-wizard__btn--primary" disabled={isSaving || text.trim() === ''} onClick={loadPasted}>
          Cargar lista
        </button>
        <button
          type="button"
          className="seasonal-wizard__btn"
          disabled={isSaving}
          onClick={() => request({ texts: traditionalCardList(), source: 'base' })}
        >
          Usar baraja tradicional
        </button>
        {onCancel && (
          <button type="button" className="seasonal-wizard__btn" disabled={isSaving} onClick={onCancel}>
            Cancelar
          </button>
        )}
        <span className="seasonal-wizard__muted">La baraja tradicional llena las 54 con su número y nombre; tú escribes las escenas.</span>
      </div>

      <WarningModal
        isOpen={!!pending}
        title="Cambiar la lista de cartas"
        message="Se borran las cartas de ahora y todo lo que ya se generó con ellas. ¿Seguir?"
        confirmText="Cambiar la lista"
        cancelText="Cancelar"
        onConfirm={() => pending && void submit(pending)}
        onCancel={() => setPending(null)}
        type="danger"
      />
    </div>
  );
};
