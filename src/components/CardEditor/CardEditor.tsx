import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  FaCheckCircle,
  FaUpload,
  FaArrowRight,
  FaMagic,
} from 'react-icons/fa';
import { useCards } from '../../hooks/useCards';
import { CardPreview } from './CardPreview';
import { CardUploadThumb } from './CardUploadThumb';
import { GridModeSelector } from '../BoardGenerator/GridModeSelector';
import { CardLabelsSelector } from './CardLabelsSelector';
import { SetRepository } from '../../repositories/SetRepository';
import { WarningModal } from '../ConfirmationModal/WarningModal';
import { GridSize } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useSetContext } from '../../contexts/SetContext';
import { deckProgress } from '../../utils/deckProgress';
import { useDeckEditing } from './useDeckEditing';
import { DeckDialogs } from './DeckDialogs';
import './CardEditor.css';
import './CardEditorDeck.css';
import { logger } from '../../utils/logger';
import { minCardsForGrid } from '../../utils/gridRules';
import type { CardLabels } from '../../utils/cardLabels';

interface CardEditorProps {
  onNext: () => void;
  onCancel: () => void;
  gridSize: GridSize;
  onGridSizeChange: (size: GridSize) => void;
  cardLabels: CardLabels;
  /** Cambia qué se ve en las cartas; `false` si no se pudo guardar (FEAT-51). */
  onCardLabelsChange: (labels: CardLabels) => Promise<boolean>;
}

export const CardEditor = ({
  onNext,
  onCancel,
  gridSize,
  onGridSizeChange,
  cardLabels,
  onCardLabelsChange,
}: CardEditorProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { currentSetId, setSets } = useSetContext();
  const cardsApi = useCards();
  const { clearCards, cardCount } = cardsApi;
  const deck = useDeckEditing(cardsApi);
  const { cards, removeCard, isCardRecentlySynced, waitingForSet, tokenBalance, ai, aiSummary, noTokensForSingle } = deck;
  const { transformingCardId, cardsToTransformIds, isAIBatchProcessing } = ai;
  const [cardLabelsError, setCardLabelsError] = useState(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const editCardIdFromRoute = (location.state as { editCardId?: string } | null)?.editCardId;
  const { setEditingCard } = deck;

  // Mínimo de cartas según el modo (ver utils/gridRules)
  const minCards = minCardsForGrid(gridSize);
  const hasMinimumCards = cardCount >= minCards;
  const progress = deckProgress(cardCount, minCards);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);

  // Arrastrar fotos al recuadro lleva a la misma ventana que «Subir fotos».
  const handleFilesDrop = (event: React.DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setIsDraggingFiles(false);
    deck.handleFilesDropped(Array.from(event.dataTransfer.files));
  };

  const handleClearCards = async () => {
    await clearCards();
    deck.closeUploads();
    setIsClearModalOpen(false);
  };

  // Al llegar desde «Editar esta carta» de una lotería guardada, se abre esa carta en cuanto cargan las cartas.
  // El encargo se borra de la navegación para que no se repita al recargar ni al regresar.
  useEffect(() => {
    if (!editCardIdFromRoute) return;
    const card = cards.find(c => c.id === editCardIdFromRoute);
    if (!card) return;
    if (!card.isProcessing && transformingCardId !== card.id) setEditingCard(card);
    navigate(location.pathname, { replace: true, state: { ...location.state, editCardId: undefined } });
  }, [editCardIdFromRoute, cards, transformingCardId, location.pathname, location.state, navigate, setEditingCard]);

  const handleGridSizeChange = (size: GridSize) => {
    onGridSizeChange(size);
    if (user && currentSetId) {
      SetRepository.updateSet(currentSetId, user.id, { grid_size: size })
        .then((updated) => {
          setSets(prev => prev.map(s => s.id === currentSetId ? { ...s, grid_size: updated.grid_size } : s));
        })
        .catch((err) => logger.error('Error saving grid size:', err));
    }
  };

  const handleCardLabelsChange = async (labels: CardLabels) => {
    setCardLabelsError(false);
    setCardLabelsError(!(await onCardLabelsChange(labels)));
  };

  return (
    <div className="deck">
      <div className="deck__columns">
        <aside className="deck__aside">
          <div className="deck__header">
            {/* C1 es solo para visitantes (FEAT-57): con sesión, la lotería se trabaja en U2 */}
            <h1 className="deck__title">{t('cardEditor.title')}</h1>
            <p className="deck__subtitle">{t('cardEditor.subtitle')}</p>
          </div>

          <GridModeSelector selectedSize={gridSize} onChange={handleGridSizeChange} t={t} />

          <CardLabelsSelector selected={cardLabels} onChange={handleCardLabelsChange} />
          {cardLabelsError && (
            <p className="deck__labels-error" role="alert">
              {t('cardEditor.labels.saveError')}
            </p>
          )}

          <div className="deck__progress">
            <div className="deck__progress-head">
              <span className="deck__progress-count">
                <strong>{t('cardEditor.deck.barCards', { count: cardCount })}</strong>{' '}
                <span className="deck__progress-min">{t('cardEditor.deck.minimum', { min: minCards })}</span>
              </span>
              {progress.isComplete ? (
                <FaCheckCircle className="deck__progress-check" aria-hidden="true" />
              ) : (
                <span className="deck__progress-missing">{t('cardEditor.deck.missing', { count: progress.missing })}</span>
              )}
            </div>
            <div
              className="deck__progress-bar"
              role="progressbar"
              aria-label={t('cardEditor.deck.progressLabel')}
              aria-valuemin={0}
              aria-valuemax={minCards}
              aria-valuenow={Math.min(cardCount, minCards)}
            >
              <span style={{ width: `${progress.percent}%` }} />
            </div>
            <p className="deck__progress-note">
              {progress.isComplete
                ? t('cardEditor.deck.ready')
                : t(gridSize === 9 ? 'cardEditor.deck.needKids' : 'cardEditor.deck.needClassic', { min: minCards })}
            </p>
            <button type="button" onClick={onNext} disabled={!hasMinimumCards} className="deck__next">
              {t('cardEditor.deck.next')}
              <FaArrowRight aria-hidden="true" />
            </button>
          </div>

          <div className="deck__add">
            <button type="button" onClick={deck.openFilePicker} className="deck__button deck__button--primary" disabled={Boolean(waitingForSet)}>
              <FaUpload aria-hidden="true" />
              {t('cardEditor.deck.uploadPhotos')}
            </button>
          </div>

          {user && cardCount > 0 && (
            <div className="deck__ai deck__ai--panel">
              <div className="deck__ai-text">
                <strong>
                  <FaMagic aria-hidden="true" /> {t('cardEditor.deck.aiPanelTitle')}
                </strong>
                <span>
                  {t('cardEditor.deck.aiPanelStatus', { transformed: aiSummary.transformed, total: aiSummary.total })}
                </span>
              </div>
              <p className="deck__ai-balance">
                {tokenBalance !== null ? t('cardEditor.deck.tokens', { count: tokenBalance }) : t('common.loading')}
                <Link to="/comprar-tokens">{t('cardEditor.deck.buy')}</Link>
              </p>
              {aiSummary.remaining > 0 ? (
                <button type="button" onClick={deck.handleAIBulkClick} className="deck__button deck__button--ai">
                  {t('cardEditor.deck.transformRest', { count: aiSummary.remaining })}
                </button>
              ) : (
                <p className="deck__ai-done">{t('cardEditor.deck.aiAllDone')}</p>
              )}
            </div>
          )}

          <details className="deck__tips">
            <summary>{t('cardEditor.deck.tipsTitle')}</summary>
            <p>{t('cardEditor.deck.tipsText')}</p>
          </details>

          <div className="deck__links">
            {cardCount > 0 && (
              <button
                type="button"
                onClick={() => !isAIBatchProcessing && setIsClearModalOpen(true)}
                className="deck__link deck__link--danger"
                disabled={Boolean(isAIBatchProcessing)}
                title={isAIBatchProcessing ? t('cardEditor.batchProcessingBlockClear') : undefined}
              >
                {t('cardEditor.deck.clear')}
              </button>
            )}
            <button type="button" onClick={onCancel} className="deck__link">
              {t('cardEditor.deck.exit')}
            </button>
          </div>
        </aside>

        <section className="deck__main" aria-labelledby="deck-cards-title">
          {waitingForSet && (
            <div className="card-editor__waiting-banner" role="status">
              <div className="spinner" style={{ width: 24, height: 24, borderWidth: 2 }} />
              <span>{t('common.loading')}</span>
            </div>
          )}
          <div className="deck__cards-head">
            <h2 id="deck-cards-title" className="deck__cards-title">
              {t('cardEditor.deck.cardsTitle', { count: cardCount })}
            </h2>
            {user && aiSummary.transformed > 0 && (
              <span className="deck__ai-count">{t('cardEditor.deck.withAi', { count: aiSummary.transformed })}</span>
            )}
            {cardCount > 0 && (
              <>
                <p className="deck__hint deck__wide-only">
                  {t(user ? 'cardEditor.deck.hoverHintUser' : 'cardEditor.deck.hoverHint')}
                </p>
                <p className="deck__hint deck__narrow-only">
                  {t(user ? 'cardEditor.deck.tapHintUser' : 'cardEditor.deck.tapHint')}
                </p>
              </>
            )}
          </div>

          <div className="deck__grid">
            {/* En celular la cuadrícula empieza con la casilla «Agregar»; en computadora está el recuadro de abajo. */}
            <div className="deck__add-tile deck__narrow-only">
              <CardUploadThumb onSingleClick={deck.openSingleUpload} />
            </div>
            {cards.map((card) => (
              <CardPreview
                key={card.id}
                card={card}
                onRemove={removeCard}
                onRevert={user ? deck.handleRevertCard : undefined}
                onTransform={user ? ai.handleSingleAI : undefined}
                disableTransformButton={!!(user && (isCardRecentlySynced(card.id) || noTokensForSingle))}
                onClick={deck.handleEditCard}
                disabledDuringBatch={isAIBatchProcessing && cardsToTransformIds.has(card.id)}
                isTransforming={transformingCardId === card.id}
              />
            ))}
          </div>

          <button
            type="button"
            className={`deck__dropzone deck__wide-only ${isDraggingFiles ? 'deck__dropzone--over' : ''}`}
            onClick={deck.openFilePicker}
            onDragOver={(event) => {
              event.preventDefault();
              setIsDraggingFiles(true);
            }}
            onDragLeave={() => setIsDraggingFiles(false)}
            onDrop={handleFilesDrop}
            disabled={Boolean(waitingForSet)}
          >
            <FaUpload aria-hidden="true" />
            <strong>{t('cardEditor.deck.dropTitle')}</strong>
            <span>{t('cardEditor.deck.dropText')}</span>
          </button>
        </section>
      </div>

      <DeckDialogs deck={deck} />

      <WarningModal
        isOpen={isClearModalOpen}
        title={t('modals.clearCards.title')}
        message={t('modals.clearCards.message')}
        confirmText={t('modals.clearCards.confirm')}
        onConfirm={handleClearCards}
        onCancel={() => setIsClearModalOpen(false)}
        type="danger"
      />

    </div >
  );
};
