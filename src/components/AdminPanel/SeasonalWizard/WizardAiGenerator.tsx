import { useState } from 'react';
import type { AiCard } from '../../../repositories/AiCardsRepository';
import { AI_CARD_SCENE_MAX_LENGTH, AI_GENERAL_PROMPT_MAX_LENGTH, type AiInputSource, type AiQuality } from '../../../utils/aiCardList';
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

const AiCardRow = ({ card, ai }: CardRowProps) => {
  const chosen = card.attempts.find((attempt) => attempt.id === card.chosenAttemptId);
  const url = chosen ? ai.urls.get(chosen.path) : undefined;
  const isGenerating = ai.generating.has(card.id);
  const error = ai.cardErrors.get(card.id);
  const sceneId = `wizard-ai-scene-${card.id}`;

  return (
    <li className="wizard-ai__card">
      <div className={`wizard-ai__result${url ? '' : ' wizard-ai__result--empty'}`} aria-busy={isGenerating}>
        {isGenerating ? (
          <span>Generando…</span>
        ) : url ? (
          <img src={url} alt={`Carta ${card.number}, ${card.name}, generada`} />
        ) : (
          <span>Sin generar</span>
        )}
      </div>
      <div className="wizard-ai__card-body">
        <b className="wizard-ai__card-title">
          {card.number} · {card.name}
        </b>
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

/** Modo «Generar con IA» del paso 2 (FEAT-50, US A2): prompt general, lista de cartas y generar una por una. */
export const WizardAiGenerator = ({ ai }: { ai: WizardAiState }) => {
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
  const ready = cards.filter((card) => card.chosenAttemptId !== null).length;
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
          <b>
            {ready} de {cards.length} listas
          </b>
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
    </div>
  );
};
