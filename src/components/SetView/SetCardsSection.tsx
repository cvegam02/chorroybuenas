import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FaMagic, FaSlidersH, FaUpload } from 'react-icons/fa';
import type { Card } from '../../types';
import { uploaderName, type LoteriaMember } from '../../utils/guestCards';
import { CardPreview } from '../CardEditor/CardPreview';
import { boardsWithCard } from '../../utils/boardIntegrity';
import type { DeckEditing } from '../CardEditor/useDeckEditing';
import type { SetViewState } from './setViewState';
import './SetCardsSection.css';

interface SetCardsSectionProps {
  state: SetViewState;
  /** Subir, editar, borrar y transformar las cartas (FEAT-57). */
  deck: DeckEditing;
  /** Quiénes participan en la lotería colectiva, para decir quién subió cada carta (FEAT-56). */
  members: ReadonlyMap<string, LoteriaMember>;
  /** Cartas de invitados nuevas en esta visita (FEAT-56). */
  newCardIds: ReadonlySet<string>;
  /** Abre la carta grande; recibe su lugar en la lista, empezando en 0. */
  onOpenCard: (index: number) => void;
  /** Abre «Ajustes»: tipo de lotería y qué se ve en las cartas. */
  onOpenSettings: () => void;
  /** Los ids de las cartas de cada tablero guardado, para avisar al borrar una que está en ellos (FEAT-60). */
  boardCardIds: readonly (readonly string[])[];
}

/**
 * Las cartas de una lotería guardada, que se editan aquí mismo (FEAT-57): subir fotos, editar, borrar,
 * IA y ajustes. Las fotos se suben solo con el recuadro «Sube las fotos de tu lotería» (FEAT-64).
 */
export const SetCardsSection = ({ state, deck, members, newCardIds, onOpenCard, onOpenSettings, boardCardIds }: SetCardsSectionProps) => {
  const { t } = useTranslation();
  const { cards, ai, aiSummary, tokenBalance } = deck;
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);

  // Solo las cartas de invitados dicen quién las subió; las del dueño no llevan nada
  const uploaderLabel = (card: Card) => {
    if (!card.uploadedBy) return undefined;
    const uploader = uploaderName(card.uploadedBy, members);
    return uploader.kind === 'named' ? t('guest.uploadedBy', { name: uploader.name }) : t('guest.uploadedByGuest');
  };

  // Soltar fotos en cualquier parte de la sección abre «Nombra tus fotos», como «Subir fotos»
  const dropHandlers = {
    onDragOver: (event: React.DragEvent) => {
      if (!event.dataTransfer.types.includes('Files')) return;
      event.preventDefault();
      setIsDraggingFiles(true);
    },
    onDragLeave: (event: React.DragEvent) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsDraggingFiles(false);
    },
    onDrop: (event: React.DragEvent) => {
      event.preventDefault();
      setIsDraggingFiles(false);
      deck.handleFilesDropped(Array.from(event.dataTransfer.files));
    },
  };

  return (
    <section className={`set-section ${isDraggingFiles ? 'set-section--dropping' : ''}`} {...dropHandlers}>
      <div className="set-section__header">
        <div className="set-section__heading">
          <h2 className="set-section__title">{t('setView.cardsTitle')}</h2>
          <span className="set-section__count">
            {aiSummary.transformed > 0
              ? t('setView.cardsCountWithAi', { cards: cards.length, ai: aiSummary.transformed })
              : cards.length}
          </span>
        </div>
        <div className="set-cards__actions">
          {cards.length > 0 && (
            <button type="button" className="set-button set-button--ai set-button--small" onClick={deck.handleAIBulkClick}>
              <FaMagic aria-hidden="true" />
              {t('setView.transformAi')}
            </button>
          )}
          <button type="button" className="set-button set-button--secondary set-button--small" onClick={onOpenSettings}>
            <FaSlidersH aria-hidden="true" />
            {t('setView.settings.open')}
          </button>
        </div>
      </div>

      {cards.length > 0 && (
        <p className="set-cards__balance">
          {t('setView.aiStatus', { transformed: aiSummary.transformed, total: aiSummary.total })}
          {' · '}
          {tokenBalance !== null ? t('cardEditor.deck.tokens', { count: tokenBalance }) : t('common.loading')}{' '}
          <Link to="/comprar-tokens">{t('cardEditor.deck.buy')}</Link>
        </p>
      )}

      {/* La única forma de subir fotos, con cartas o sin ellas (FEAT-64); con cartas, más bajito */}
      <button
        type="button"
        className={`set-cards__dropzone ${cards.length > 0 ? 'set-cards__dropzone--compact' : ''}`}
        onClick={deck.openFilePicker}
        disabled={deck.waitingForSet}
      >
        <FaUpload aria-hidden="true" />
        <strong>{t('setView.emptyCardsTitle')}</strong>
        <span>{t('cardEditor.deck.dropText')}</span>
      </button>

      {cards.length > 0 && (
        <div className="set-cards__grid">
          {cards.map((card, index) => (
            <CardPreview
              key={card.id}
              card={card}
              onRemove={deck.removeCard}
              onRevert={deck.handleRevertCard}
              onTransform={ai.handleSingleAI}
              disableTransformButton={deck.isCardRecentlySynced(card.id) || deck.noTokensForSingle}
              onClick={deck.handleEditCard}
              onOpen={() => onOpenCard(index)}
              disabledDuringBatch={ai.isAIBatchProcessing && ai.cardsToTransformIds.has(card.id)}
              isTransforming={ai.transformingCardId === card.id}
              uploaderLabel={uploaderLabel(card)}
              isNew={newCardIds.has(card.id)}
              boardsWithCard={boardsWithCard(boardCardIds, card.id)}
            />
          ))}
        </div>
      )}

      {cards.length > 0 && (
        <p className="set-section__note">
          <span className="set-cards__wide-only">{t('setView.cardsNoteEdit')}</span>
          <span className="set-cards__narrow-only">{t('setView.cardsNoteEditTouch')}</span>
          {state.kind === 'missingCards' && <> {t('setView.missingCardsNote', { min: state.min })}</>}
        </p>
      )}
    </section>
  );
};
