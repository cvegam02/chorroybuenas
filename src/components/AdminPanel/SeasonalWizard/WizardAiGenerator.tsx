import { useState, type ReactNode } from 'react';
import type { AiCard } from '../../../repositories/AiCardsRepository';
import { AI_CARD_NAME_MAX_LENGTH, AI_CARD_SCENE_MAX_LENGTH, AI_GENERAL_PROMPT_MAX_LENGTH, type AiInputSource, type AiQuality } from '../../../utils/aiCardList';
import { BASE_DECK_SIZE } from '../../../utils/baseDeck';
import type { WizardAiState } from './useWizardAi';
import { WizardAiListLoader } from './WizardAiListLoader';
import { WizardAiSceneLoader } from './WizardAiSceneLoader';
import './WizardAiGenerator.css';

const QUALITIES: { value: AiQuality; label: string }[] = [
  { value: 'low', label: 'Low (para probar)' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

interface CardRowProps {
  card: AiCard;
  ai: WizardAiState;
}

/** Los intentos de una carta en chico, para cambiar cuál se queda (US A3). */
const AttemptStrip = ({ card, ai }: CardRowProps) => {
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

const AiCardRow = ({ card, ai }: CardRowProps) => {
  const chosen = card.attempts.find((attempt) => attempt.id === card.chosenAttemptId);
  const url = chosen ? ai.urls.get(chosen.path) : undefined;
  const isGenerating = ai.generating.has(card.id);
  const error = ai.cardErrors.get(card.id);
  const sceneId = `wizard-ai-scene-${card.id}`;
  const { referenceCardId } = ai.build;
  const isReference = referenceCardId === card.id;

  return (
    <li className="wizard-ai__card">
      <div className="wizard-ai__media">
        <div className={`wizard-ai__result${url ? '' : ' wizard-ai__result--empty'}`} aria-busy={isGenerating}>
          {isGenerating ? (
            <span>Generando…</span>
          ) : url ? (
            <img src={url} alt={`Carta ${card.number}, ${card.name}, generada`} />
          ) : (
            <span>Sin generar</span>
          )}
        </div>
        <AttemptStrip card={card} ai={ai} />
      </div>
      <div className="wizard-ai__card-body">
        <div className="wizard-ai__card-head">
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
              <button type="button" className="seasonal-wizard__link-btn" onClick={() => ai.setReference(card.id)}>
                Usar como referencia
              </button>
            )
          )}
        </div>
        <label htmlFor={sceneId} className="seasonal-wizard__muted">
          Escena
        </label>
        <textarea
          id={sceneId}
          className="seasonal-wizard__field seasonal-wizard__textarea"
          rows={3}
          maxLength={AI_CARD_SCENE_MAX_LENGTH}
          value={card.scene}
          onChange={(e) => ai.setScene(card.id, e.target.value)}
          onBlur={() => ai.saveCard(card.id)}
        />
        <div className="wizard-ai__card-actions">
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
            className="seasonal-wizard__btn seasonal-wizard__btn--primary"
            disabled={isGenerating}
            onClick={() => void ai.generate(card.id)}
          >
            {isGenerating ? 'Generando…' : chosen ? 'Rehacer' : 'Generar'}
          </button>
        </div>
        {error && (
          <p className="seasonal-wizard__field-error" role="alert">
            {error}
          </p>
        )}
      </div>
    </li>
  );
};

/**
 * Modo «Generar con IA» del paso 2 (FEAT-50, US A2 y A3): prompt general, lista de cartas, generar una
 * por una, elegir intento y marcar una carta como referencia de estilo. Abajo, `children` (US A4).
 */
export const WizardAiGenerator = ({ ai, children }: { ai: WizardAiState; children?: ReactNode }) => {
  const [panel, setPanel] = useState<'list' | 'scenes' | null>(null);

  if (ai.status === 'loading' || ai.status === 'idle') return <p className="seasonal-wizard__muted">Cargando las cartas generadas…</p>;
  if (ai.status === 'failed') {
    return (
      <div>
        <p className="seasonal-wizard__field-error">No se pudieron cargar las cartas generadas.</p>
        <button type="button" className="seasonal-wizard__btn" onClick={ai.reload}>
          Reintentar
        </button>
      </div>
    );
  }

  const { cards } = ai.build;
  const hasAttempts = cards.some((card) => card.attempts.length > 0);

  return (
    <div className="wizard-ai">
      <div className="seasonal-wizard__label">
        <label htmlFor="wizard-ai-prompt">Prompt general de la temática</label>
        <textarea
          id="wizard-ai-prompt"
          className="seasonal-wizard__field seasonal-wizard__textarea"
          rows={4}
          maxLength={AI_GENERAL_PROMPT_MAX_LENGTH}
          value={ai.build.generalPrompt}
          placeholder="Ej.: Carta de lotería mexicana navideña, estilo litografía antigua…"
          onChange={(e) => ai.setGeneralPrompt(e.target.value)}
          onBlur={() => void ai.saveSettings()}
        />
        <span className="seasonal-wizard__muted">A cada carta se le agrega su número, su nombre y su escena.</span>
      </div>

      <label className="wizard-ai__quality">
        <span className="seasonal-wizard__muted">Calidad</span>
        <select className="seasonal-wizard__field" value={ai.build.quality} onChange={(e) => ai.setQuality(e.target.value as AiQuality)}>
          {QUALITIES.map((quality) => (
            <option key={quality.value} value={quality.value}>
              {quality.label}
            </option>
          ))}
        </select>
      </label>

      {cards.length === 0 || panel === 'list' ? (
        <WizardAiListLoader
          hasAttempts={hasAttempts}
          isSaving={ai.isSaving}
          onLoad={async (texts, source) => {
            const ok = await ai.loadList(texts, source);
            // Una lista sin escenas (la baraja tradicional) sigue directo a pegar las escenas.
            if (ok) setPanel(texts.every((text) => text.scene === '') ? 'scenes' : null);
            return ok;
          }}
        />
      ) : (
        <div className="seasonal-wizard__counter-row">
          <b>{cards.length === 1 ? '1 carta en la lista' : `${cards.length} cartas en la lista`}</b>
          <span>
            <button type="button" className="seasonal-wizard__link-btn" onClick={() => setPanel('scenes')}>
              Cargar escenas
            </button>{' '}
            <button type="button" className="seasonal-wizard__link-btn" onClick={() => setPanel('list')}>
              Cambiar la lista
            </button>
          </span>
        </div>
      )}

      {cards.length > 0 && panel === 'scenes' && (
        <WizardAiSceneLoader cards={cards} isSaving={ai.isSaving} onLoad={ai.loadScenes} onClose={() => setPanel(null)} />
      )}

      {ai.error && (
        <p className="seasonal-wizard__field-error" role="alert">
          {ai.error}
        </p>
      )}

      {cards.length > 0 && (
        <ul className="wizard-ai__cards">
          {cards.map((card) => (
            <AiCardRow key={card.id} card={card} ai={ai} />
          ))}
        </ul>
      )}

      {cards.length > 0 && children}
    </div>
  );
};
