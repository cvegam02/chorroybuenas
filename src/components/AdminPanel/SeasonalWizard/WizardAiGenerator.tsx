import { useEffect, useState, type ReactNode } from 'react';
import type { AiCard } from '../../../repositories/AiCardsRepository';
import { AI_GENERAL_PROMPT_MAX_LENGTH, type AiQuality } from '../../../utils/aiCardList';
import {
  aiCardStatus,
  countAiCardFilters,
  filterAiCards,
  hasNoScene,
  neighborCardId,
  type AiCardFilter,
  type AiCardStatus,
} from '../../../utils/aiCardView';
import type { WizardAiState } from './useWizardAi';
import { WizardAiCardPanel } from './WizardAiCardPanel';
import { WizardAiListLoader } from './WizardAiListLoader';
import { WizardAiSceneLoader } from './WizardAiSceneLoader';
import './WizardAiGenerator.css';
import { LoadingLine } from './WizardBusy';

const QUALITIES: { value: AiQuality; label: string }[] = [
  { value: 'low', label: 'Low (para probar)' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

const FILTER_LABELS: Record<AiCardFilter, string> = {
  all: 'Todas',
  noScene: 'Sin escena',
  pending: 'Sin generar',
  ready: 'Listas',
  error: 'Con error',
};

const STATUS_LABELS: Record<AiCardStatus, string> = {
  generating: 'Generando',
  error: 'Con error',
  ready: 'Lista',
  pending: 'Sin generar',
};

interface GridCardProps {
  card: AiCard;
  ai: WizardAiState;
  status: AiCardStatus;
  isSelected: boolean;
  onSelect: () => void;
}

/** Una carta en la cuadrícula (decisión 15): miniatura 2:3, número, nombre y estado. */
const GridCard = ({ card, ai, status, isSelected, onSelect }: GridCardProps) => {
  const chosen = card.attempts.find((attempt) => attempt.id === card.chosenAttemptId);
  const url = chosen ? ai.urls.get(chosen.path) : undefined;
  const noScene = hasNoScene(card);
  return (
    <li id={`wizard-ai-tile-${card.id}`}>
      <button
        type="button"
        className={`wizard-ai__tile${isSelected ? ' wizard-ai__tile--selected' : ''}`}
        aria-pressed={isSelected}
        aria-label={`Carta ${card.number}, ${card.name}: ${STATUS_LABELS[status]}${noScene ? ', sin escena' : ''}`}
        onClick={onSelect}
      >
        <span
          className={`wizard-ai__thumb${url && status !== 'generating' ? '' : ' wizard-ai__thumb--empty'}${status === 'generating' ? ' wizard-busy__shimmer' : ''}`}
        >
          {url && status !== 'generating' && <img src={url} alt="" loading="lazy" />}
          <span className="wizard-ai__tile-number">{card.number}</span>
          {ai.build.referenceCardId === card.id && <span className="wizard-ai__tile-ref">Ref.</span>}
          {card.attempts.length > 1 && <span className="wizard-ai__tile-tries">{card.attempts.length}</span>}
        </span>
        <span className="wizard-ai__tile-name">{card.name || 'Sin nombre'}</span>
        <span className="wizard-ai__tile-tags">
          <span className={`wizard-ai__status wizard-ai__status--${status}`}>{STATUS_LABELS[status]}</span>
          {noScene && <span className="wizard-ai__status wizard-ai__status--no-scene">Sin escena</span>}
        </span>
      </button>
    </li>
  );
};

const isTyping = () => {
  const tag = document.activeElement?.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
};

/**
 * Modo «Generar con IA» del paso 2 (FEAT-50, US A2, A3 y A6): prompt general, lista de cartas en cuadrícula
 * con filtros y el detalle de la carta elegida en un panel (decisión 15); generar una
 * por una, elegir intento y marcar una carta como referencia de estilo. Abajo, `children` (US A4).
 */
export const WizardAiGenerator = ({ ai, children }: { ai: WizardAiState; children?: ReactNode }) => {
  const [panel, setPanel] = useState<'list' | 'scenes' | null>(null);
  const [filter, setFilter] = useState<AiCardFilter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isEditingPrompt, setIsEditingPrompt] = useState(false);

  const { cards } = ai.build;
  const shown = filterAiCards(cards, filter, ai.generating, ai.cardErrors);
  const selected = cards.find((card) => card.id === selectedId) ?? null;
  const previousId = selectedId ? neighborCardId(shown, selectedId, -1) : null;
  const nextId = selectedId ? neighborCardId(shown, selectedId, 1) : null;

  // ← → cambian de carta y Esc cierra el panel, salvo mientras se escribe en un campo.
  useEffect(() => {
    if (!selectedId) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        // Al cerrar escribiendo, se suelta el campo primero para que se guarde lo escrito (se guarda al salir de él).
        if (isTyping() && document.activeElement instanceof HTMLElement) document.activeElement.blur();
        setSelectedId(null);
        return;
      }
      if (isTyping()) return;
      if (event.key === 'ArrowLeft' && previousId) setSelectedId(previousId);
      if (event.key === 'ArrowRight' && nextId) setSelectedId(nextId);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedId, previousId, nextId]);

  // La carta elegida se mantiene a la vista en la cuadrícula al pasar con las flechas.
  useEffect(() => {
    if (selectedId) document.getElementById(`wizard-ai-tile-${selectedId}`)?.scrollIntoView({ block: 'nearest' });
  }, [selectedId]);

  if (ai.status === 'loading' || ai.status === 'idle') return <LoadingLine text="Cargando las cartas generadas…" />;
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

  const hasAttempts = cards.some((card) => card.attempts.length > 0);
  // Mientras se elige otra lista, la de ahora no se muestra: se va a reemplazar.
  const showCards = cards.length > 0 && panel !== 'list';
  const counts = countAiCardFilters(cards, ai.generating, ai.cardErrors);

  return (
    <div className="wizard-ai">
      {cards.length > 0 && !isEditingPrompt && ai.build.generalPrompt.trim() !== '' ? (
        <div className="wizard-ai__prompt-summary">
          <span className="wizard-ai__prompt-text">
            <b>Prompt general:</b> {ai.build.generalPrompt}
          </span>
          <span className="wizard-ai__quality-chip">Calidad: {QUALITIES.find((q) => q.value === ai.build.quality)?.label}</span>
          <button type="button" className="seasonal-wizard__link-btn" onClick={() => setIsEditingPrompt(true)}>
            Editar
          </button>
        </div>
      ) : (
        <>
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

          <div className="wizard-ai__quality-row">
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
            {isEditingPrompt && (
              <button type="button" className="seasonal-wizard__btn" onClick={() => setIsEditingPrompt(false)}>
                Listo
              </button>
            )}
          </div>
        </>
      )}

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
          onCancel={cards.length > 0 ? () => setPanel(null) : undefined}
        />
      ) : (
        <div className="seasonal-wizard__counter-row">
          <b>{cards.length === 1 ? '1 carta en la lista' : `${cards.length} cartas en la lista`}</b>
          <span className="wizard-ai__list-actions">
            <button type="button" className="seasonal-wizard__btn" onClick={() => setPanel('scenes')}>
              Cargar escenas
            </button>
            <button type="button" className="seasonal-wizard__btn" onClick={() => setPanel('list')}>
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

      {showCards && (
        <>
          <div className="wizard-ai__filters" role="group" aria-label="Filtrar cartas">
            {(Object.keys(FILTER_LABELS) as AiCardFilter[]).map((key) => (
              <button
                key={key}
                type="button"
                className={`wizard-ai__filter${filter === key ? ' wizard-ai__filter--on' : ''}`}
                aria-pressed={filter === key}
                onClick={() => {
                  setFilter(key);
                  // Si la carta abierta no está en el filtro nuevo, el panel se cierra.
                  if (selectedId && !filterAiCards(cards, key, ai.generating, ai.cardErrors).some((card) => card.id === selectedId)) {
                    setSelectedId(null);
                  }
                }}
              >
                {FILTER_LABELS[key]}
                <span className="wizard-ai__filter-count">{counts[key]}</span>
              </button>
            ))}
          </div>

          <div className={`wizard-ai__work${selected ? ' wizard-ai__work--detail' : ''}`}>
            {shown.length > 0 ? (
              <ul className="wizard-ai__grid">
                {shown.map((card) => (
                  <GridCard
                    key={card.id}
                    card={card}
                    ai={ai}
                    status={aiCardStatus(card, ai.generating, ai.cardErrors)}
                    isSelected={card.id === selectedId}
                    onSelect={() => setSelectedId(card.id === selectedId ? null : card.id)}
                  />
                ))}
              </ul>
            ) : (
              <p className="wizard-ai__grid-empty seasonal-wizard__muted">No hay cartas en este filtro.</p>
            )}
            {selected && (
              <WizardAiCardPanel
                key={selected.id}
                card={selected}
                ai={ai}
                position={(() => {
                  const index = shown.findIndex((card) => card.id === selected.id);
                  return index < 0 ? '' : `${index + 1} de ${shown.length}${filter === 'all' ? '' : ` · ${FILTER_LABELS[filter]}`}`;
                })()}
                onPrevious={previousId ? () => setSelectedId(previousId) : null}
                onNext={nextId ? () => setSelectedId(nextId) : null}
                onClose={() => setSelectedId(null)}
              />
            )}
          </div>
        </>
      )}

      {showCards && children}
    </div>
  );
};
