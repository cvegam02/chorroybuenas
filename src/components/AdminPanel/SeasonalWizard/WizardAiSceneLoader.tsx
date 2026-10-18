import { useState } from 'react';
import { parseSceneList, type AiCardListError, type SceneUpdate } from '../../../utils/aiCardList';

interface WizardAiSceneLoaderProps {
  cards: readonly { number: number; name: string }[];
  isSaving: boolean;
  onLoad: (scenes: ReadonlyMap<number, SceneUpdate>) => Promise<boolean>;
  onClose: () => void;
}

const EXAMPLE = '1 | un gallo con bufanda roja cantando sobre un trineo\n26 | EL DUENDE | un duende de Santa con traje verde…';

/** «Cargar escenas» (FEAT-50, decisiones 11 y 12): las escenas de todas las cartas de una vez, por número; un nombre distinto renombra la carta. */
export const WizardAiSceneLoader = ({ cards, isSaving, onLoad, onClose }: WizardAiSceneLoaderProps) => {
  const [text, setText] = useState('');
  const [errors, setErrors] = useState<AiCardListError[]>([]);

  const load = async () => {
    const { scenes, errors: found } = parseSceneList(text, cards);
    setErrors(found);
    if (found.length > 0 || scenes.size === 0) return;
    if (await onLoad(scenes)) {
      setText('');
      onClose();
    }
  };

  return (
    <div className="wizard-ai__loader">
      <div className="seasonal-wizard__label">
        <label htmlFor="wizard-ai-scenes">Pega las escenas, una por renglón: número | escena (o número | NOMBRE | escena)</label>
        <textarea
          id="wizard-ai-scenes"
          className="seasonal-wizard__field seasonal-wizard__textarea wizard-ai__list-field"
          rows={6}
          value={text}
          placeholder={EXAMPLE}
          aria-describedby={errors.length > 0 ? 'wizard-ai-scenes-errors' : undefined}
          onChange={(e) => setText(e.target.value)}
        />
      </div>
      {errors.length > 0 && (
        <ul id="wizard-ai-scenes-errors" className="wizard-ai__list-errors" role="alert">
          {errors.map((error) => (
            <li key={error.line}>
              Renglón {error.line}: {error.reason} — «{error.text}»
            </li>
          ))}
        </ul>
      )}
      <div className="wizard-ai__loader-actions">
        <button
          type="button"
          className="seasonal-wizard__btn seasonal-wizard__btn--primary"
          disabled={isSaving || text.trim() === ''}
          onClick={() => void load()}
        >
          Cargar escenas
        </button>
        <button type="button" className="seasonal-wizard__btn" onClick={onClose}>
          Cerrar
        </button>
        <span className="seasonal-wizard__muted">
          Cada escena va a la carta de su número; si pones otro nombre, la carta se renombra. Lo ya generado no se borra.
        </span>
      </div>
    </div>
  );
};
