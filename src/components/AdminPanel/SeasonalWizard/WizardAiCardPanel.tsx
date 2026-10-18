import { FaArrowLeft, FaArrowRight, FaTimes } from 'react-icons/fa';
import { useMediaQuery } from '../../../hooks/useMediaQuery';
import { usePageScrollLock } from '../../../hooks/usePageScrollLock';
import type { AiCard } from '../../../repositories/AiCardsRepository';
import { AI_CARD_NAME_MAX_LENGTH, AI_CARD_SCENE_MAX_LENGTH, type AiInputSource } from '../../../utils/aiCardList';
import { BASE_DECK_SIZE } from '../../../utils/baseDeck';
import type { WizardAiState } from './useWizardAi';
import { BusyLabel } from './WizardBusy';

interface CardProps {
  card: AiCard;
  ai: WizardAiState;
}

/** Los intentos de una carta en chico, para cambiar cuál se queda (US A3). */
const AttemptStrip = ({ card, ai }: CardProps) => {
  if (card.attempts.length < 2) return null;
  return (
    <div className="wizard-ai__attempts" role="group" aria-label={`Intentos de la carta ${card.number}`}>
      {card.attempts.map((attempt, index) => {
        const url = ai.urls.get(attempt.path);
        const isChosen = attempt.id === card.chosenAttemptId;
        return (
          <button
            key={attempt.id}
            type="button"
            className={`wizard-ai__attempt${isChosen ? ' wizard-ai__attempt--chosen' : ''}`}
            aria-pressed={isChosen}
            aria-label={`Intento ${index + 1}${isChosen ? ', elegido' : ''}`}
            disabled={ai.generating.has(card.id)}
            onClick={() => ai.chooseAttempt(card.id, attempt.id)}
          >
            {url ? <img src={url} alt="" /> : <span>{index + 1}</span>}
          </button>
        );
      })}
    </div>
  );
};

interface WizardAiCardPanelProps extends CardProps {
  /** «3 de 54», dentro del filtro; vacío si la carta ya no está en el filtro. */
  position: string;
  onPrevious: (() => void) | null;
  onNext: (() => void) | null;
  onClose: () => void;
}

/**
 * Detalle de una carta del modo «Generar con IA» (FEAT-50, US A6, decisión 15): lo que antes tenía cada fila
 * (US A2 y A3), en un panel a la derecha de la cuadrícula; en celular, a pantalla completa encima.
 */
export const WizardAiCardPanel = ({ card, ai, position, onPrevious, onNext, onClose }: WizardAiCardPanelProps) => {
  const chosen = card.attempts.find((attempt) => attempt.id === card.chosenAttemptId);
  const url = chosen ? ai.urls.get(chosen.path) : undefined;
  const isGenerating = ai.generating.has(card.id);
  const error = ai.cardErrors.get(card.id);
  const sceneId = `wizard-ai-scene-${card.id}`;
  const { referenceCardId } = ai.build;
  const isReference = referenceCardId === card.id;
  // En celular el panel tapa la pantalla: la página de atrás no se desplaza (el ancho, como en el CSS).
  usePageScrollLock(useMediaQuery('(max-width: 900px)'));

  return (
    <aside className="wizard-ai__panel" aria-label={`Carta ${card.number}, ${card.name}`}>
      <div className="wizard-ai__panel-head">
        <button type="button" className="wizard-ai__icon-btn" aria-label="Carta anterior" disabled={!onPrevious} onClick={onPrevious ?? undefined}>
          <FaArrowLeft aria-hidden="true" />
        </button>
        <button type="button" className="wizard-ai__icon-btn" aria-label="Carta siguiente" disabled={!onNext} onClick={onNext ?? undefined}>
          <FaArrowRight aria-hidden="true" />
        </button>
        <span className="wizard-ai__panel-position seasonal-wizard__muted">{position}</span>
        <button type="button" className="wizard-ai__icon-btn" aria-label="Cerrar" onClick={onClose}>
          <FaTimes aria-hidden="true" />
        </button>
      </div>

      <div className="wizard-ai__panel-body">
        <div className="wizard-ai__panel-media">
          <div
            className={`wizard-ai__result${url ? '' : ' wizard-ai__result--empty'}${isGenerating ? ' wizard-busy__shimmer' : ''}`}
            aria-busy={isGenerating}
          >
            {isGenerating ? (
              <BusyLabel busy text="Generando…" />
            ) : url ? (
              <img src={url} alt={`Carta ${card.number}, ${card.name}, generada`} />
            ) : (
              <span>Sin generar</span>
            )}
          </div>
          <AttemptStrip card={card} ai={ai} />
        </div>

        {error && (
          <p className="seasonal-wizard__field-error" role="alert">
            {error}
          </p>
        )}

        <span className="wizard-ai__card-title">
          <b>{card.number}</b>
          <input
            aria-label={`Nombre de la carta ${card.number}`}
            className="seasonal-wizard__field wizard-ai__name"
            maxLength={AI_CARD_NAME_MAX_LENGTH}
            value={card.name}
            onChange={(e) => ai.setName(card.id, e.target.value)}
            onBlur={() => ai.saveCard(card.id)}
          />
        </span>

        {isReference ? (
          <span className="wizard-ai__reference">
            <span className="wizard-ai__reference-badge">Referencia de estilo</span>
            <button type="button" className="seasonal-wizard__link-btn" onClick={() => ai.setReference(null)}>
              Quitar
            </button>
          </span>
        ) : (
          chosen && (
            <button type="button" className="seasonal-wizard__link-btn wizard-ai__reference-set" onClick={() => ai.setReference(card.id)}>
              Usar como referencia
            </button>
          )
        )}

        <label htmlFor={sceneId} className="seasonal-wizard__muted">
          Escena
        </label>
        <textarea
          id={sceneId}
          className="seasonal-wizard__field seasonal-wizard__textarea"
          rows={4}
          maxLength={AI_CARD_SCENE_MAX_LENGTH}
          value={card.scene}
          placeholder="Describe lo que aparece en la carta…"
          onChange={(e) => ai.setScene(card.id, e.target.value)}
          onBlur={() => ai.saveCard(card.id)}
        />

        <label className="wizard-ai__source">
          <span className="seasonal-wizard__muted">Imagen de partida</span>
          <select
            className="seasonal-wizard__field"
            value={card.inputSource}
            onChange={(e) => ai.saveCard(card.id, { inputSource: e.target.value as AiInputSource })}
          >
            <option value="base" disabled={card.number > BASE_DECK_SIZE}>
              Su carta de la baraja base
            </option>
            <option value="reference" disabled={!referenceCardId}>
              La carta de referencia
            </option>
            <option value="none">Ninguna, solo el prompt</option>
          </select>
        </label>

        <button
          type="button"
          className="seasonal-wizard__btn seasonal-wizard__btn--primary wizard-ai__generate"
          disabled={isGenerating}
          onClick={() => void ai.generate(card.id)}
        >
          <BusyLabel busy={isGenerating} text={isGenerating ? 'Generando…' : error ? 'Reintentar' : chosen ? 'Rehacer' : 'Generar'} />
        </button>

        <p className="wizard-ai__keys seasonal-wizard__muted">
          Usa <kbd>←</kbd> <kbd>→</kbd> para cambiar de carta y <kbd>Esc</kbd> para cerrar.
        </p>
      </div>
    </aside>
  );
};
