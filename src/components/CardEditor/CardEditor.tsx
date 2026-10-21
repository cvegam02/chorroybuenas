import { useState, useRef, useMemo, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  FaCheckCircle,
  FaUpload,
  FaArrowRight,
  FaMagic,
  FaExclamationTriangle,
  FaPencilAlt
} from 'react-icons/fa';
import { useCards } from '../../hooks/useCards';
import { CardPreview } from './CardPreview';
import { CardUploadThumb } from './CardUploadThumb';
import { CardUploadModal } from './CardUploadModal';
import { CardEditModal } from './CardEditModal';
import { BatchUploadModal } from './BatchUploadModal';
import { UploadProgressModal } from './UploadProgressModal';
import { GridModeSelector } from '../BoardGenerator/GridModeSelector';
import { CardLabelsSelector } from './CardLabelsSelector';
import { SetRepository } from '../../repositories/SetRepository';
import { AIBatchModal } from './AIBatchModal';
import { useCardAI } from './useCardAI';
import { WarningModal } from '../ConfirmationModal/WarningModal';
import { Card, GridSize } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useSetContext } from '../../contexts/SetContext';
import { useTokenBalance } from '../../contexts/TokenContext';
import { aiDeckSummary, deckProgress, pickImageFiles } from '../../utils/deckProgress';
import { newUuid } from '../../utils/newUuid';
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
  const { sets, currentSetId, setSets } = useSetContext();
  const { balance: tokenBalance, refreshBalance } = useTokenBalance();
  const currentSet = sets.find(s => s.id === currentSetId);
  const { cards, addCard, addCards, removeCard, updateCard, clearCards, cardCount, isCardRecentlySynced } = useCards();
  /** Usuario logueado sin lotería seleccionada: esperar a que SetContext cargue o crear una. */
  const waitingForSet = user && !currentSetId;
  const [isRenaming, setIsRenaming] = useState(false);
  const [cardLabelsError, setCardLabelsError] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [batchFiles, setBatchFiles] = useState<File[]>([]);
  const batchInputRef = useRef<HTMLInputElement>(null);
  const {
    aiErrorMessage,
    setAiErrorMessage,
    aiBatchStatus,
    aiBatchCurrentIndex,
    aiBatchTotalCount,
    aiBatchCardIds,
    aiBatchSkippedCount,
    aiBatchError,
    showBatchCompleteMessage,
    setShowBatchCompleteMessage,
    transformingCardId,
    batchModalClosedDuringProcessingRef,
    cardsToTransform,
    cardsToTransformIds,
    isAIBatchProcessing,
    handleSingleAI,
    handleAIStart,
  } = useCardAI({ cards, updateCard, userId: user?.id, currentSetId, refreshBalance, t, isAIModalOpen });
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const editCardIdFromRoute = (location.state as { editCardId?: string } | null)?.editCardId;
  // La carta como está ahora: la ventana de editar ve al momento una versión con IA recién guardada.
  const liveEditingCard = editingCard ? cards.find(card => card.id === editingCard.id) ?? editingCard : null;
  const [showUploadProgress, setShowUploadProgress] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(-1);
  const [showAllTransformedModal, setShowAllTransformedModal] = useState(false);

  // Mínimo de cartas según el modo (ver utils/gridRules)
  const minCards = minCardsForGrid(gridSize);
  const hasMinimumCards = cardCount >= minCards;
  const progress = deckProgress(cardCount, minCards);
  const aiSummary = aiDeckSummary(cards);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const noTokensForSingle = user && tokenBalance !== null && tokenBalance < 1;

  const normalizeTitle = (value: string) => value.replace(/\s+/g, ' ').trim().toLowerCase();

  const existingTitleSet = useMemo(
    () => new Set(cards.map(card => normalizeTitle(card.title))),
    [cards]
  );

  const handleCardAdd = async (image: string, title: string) => {
    const normalizedTitle = normalizeTitle(title);
    if (existingTitleSet.has(normalizedTitle)) {
      alert(t('cardEditor.errors.duplicateTitle'));
      return false;
    }
    const newCard: Card = {
      id: newUuid(),
      title,
      image,
    };
    setShowUploadProgress(true);
    setUploadProgress(-1);
    try {
      await addCard(newCard);
      setUploadProgress(100);
      await new Promise(r => setTimeout(r, 300));
      return true;
    } finally {
      setShowUploadProgress(false);
    }
  };

  const handleBatchCardsAdd = async (cardsToAdd: Array<{ image: string; title: string }>) => {
    const seenTitles = new Set(existingTitleSet);
    const duplicateTitles: string[] = [];
    for (const card of cardsToAdd) {
      const normalizedTitle = normalizeTitle(card.title);
      if (seenTitles.has(normalizedTitle)) {
        duplicateTitles.push(card.title);
      } else {
        seenTitles.add(normalizedTitle);
      }
    }

    if (duplicateTitles.length > 0) {
      alert(t('cardEditor.errors.batchDuplicates', { titles: duplicateTitles.join(', ') }));
      return;
    }

    // Create all new cards with unique UUIDs (required for Supabase cards table)
    const newCards: Card[] = cardsToAdd.map(({ image, title }) => ({
      id: newUuid(),
      title,
      image,
    }));

    setShowUploadProgress(true);
    setUploadProgress(user ? 0 : -1);
    try {
      await addCards(newCards, user ? {
        onProgress: (current, total) => setUploadProgress((current / total) * 100)
      } : undefined);
      setUploadProgress(100);
      await new Promise(r => setTimeout(r, 300));
    } finally {
      setShowUploadProgress(false);
    }
  };

  const handleBatchClick = () => {
    batchInputRef.current?.click();
  };

  const openBatchWith = (files: File[]) => {
    if (files.length > 0) {
      setBatchFiles(files);
      setIsBatchModalOpen(true);
    }
  };

  const handleBatchFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    openBatchWith(Array.from(event.target.files || []));
    // Reset input so same files can be selected again
    if (batchInputRef.current) {
      batchInputRef.current.value = '';
    }
  };

  // Arrastrar fotos al recuadro lleva a la misma ventana que «Subir fotos».
  const handleFilesDrop = (event: React.DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setIsDraggingFiles(false);
    if (waitingForSet) return;
    openBatchWith(pickImageFiles(Array.from(event.dataTransfer.files)));
  };

  const handleClearCards = async () => {
    await clearCards();
    setIsUploadModalOpen(false);
    setIsBatchModalOpen(false);
    setBatchFiles([]);
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
  }, [editCardIdFromRoute, cards, transformingCardId, location.pathname, location.state, navigate]);

  const handleEditCard = (card: Card) => {
    // Mientras la IA pinta la carta no se abre: al terminar, la carta ya trae su versión nueva.
    if (card.isProcessing || transformingCardId === card.id) return;
    setEditingCard(card);
  };


  const handleRevertCard = async (id: string) => {
    const card = cards.find(c => c.id === id);
    if (card && card.originalImage) {
      await updateCard(id, {
        image: card.originalImage,
        originalImage: undefined,
        isAiGenerated: false
      });
    }
  };


  const handleRenameStart = () => {
    setRenameValue(currentSet?.name ?? '');
    setIsRenaming(true);
  };

  const handleRenameSave = async () => {
    const name = renameValue.trim();
    if (!name || !currentSet?.id || !user) return;
    if (name === currentSet.name) {
      setIsRenaming(false);
      return;
    }
    setIsSavingName(true);
    try {
      const updated = await SetRepository.updateSet(currentSet.id, user.id, { name });
      setSets(prev => prev.map(s => (s.id === currentSet.id ? { ...s, name: updated.name } : s)));
      setIsRenaming(false);
    } catch (err) {
      logger.error('Error renaming set:', err);
    } finally {
      setIsSavingName(false);
    }
  };

  const handleRenameCancel = () => {
    setRenameValue(currentSet?.name ?? '');
    setIsRenaming(false);
  };

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

  const handleAIBulkClick = () => {
    if (cardsToTransform.length === 0) {
      setShowAllTransformedModal(true);
      return;
    }
    // Sin tokens suficientes también se abre la ventana, que dice cuántos faltan (FEAT-34, US A3).
    setIsAIModalOpen(true);
  };

  return (
    <div className="deck">
      <div className="deck__columns">
        <aside className="deck__aside">
          <div className="deck__header">
            {user && currentSet && <span className="deck__kicker">{t('cardEditor.deck.yourLoteria')}</span>}
            {user && currentSet ? (
              isRenaming ? (
                <div className="card-editor__rename">
                  <input
                    type="text"
                    className="card-editor__rename-input"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRenameSave();
                      if (e.key === 'Escape') handleRenameCancel();
                    }}
                    placeholder={t('setView.renamePlaceholder')}
                    autoFocus
                    disabled={isSavingName}
                    aria-label={t('setView.renameSet')}
                  />
                  <div className="card-editor__rename-actions">
                    <button type="button" onClick={handleRenameCancel} disabled={isSavingName} className="card-editor__rename-cancel">
                      {t('common.cancel')}
                    </button>
                    <button type="button" onClick={handleRenameSave} disabled={isSavingName || !renameValue.trim()} className="card-editor__rename-save">
                      {isSavingName ? t('common.loading') : t('common.save')}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="card-editor__title-row">
                  <h1 className="deck__title">{currentSet.name}</h1>
                  <button type="button" className="card-editor__rename-btn" onClick={handleRenameStart} aria-label={t('setView.renameSet')} title={t('setView.renameSet')}>
                    <FaPencilAlt />
                  </button>
                </div>
              )
            ) : (
              <h1 className="deck__title">{t('cardEditor.title')}</h1>
            )}
            {user && currentSet ? (
              <p className="deck__subtitle">
                <span className="deck__wide-only">{t('cardEditor.deck.autosave')}</span>
                <span className="deck__narrow-only">{t('createSteps.saved')}</span>
              </p>
            ) : (
              <p className="deck__subtitle">{t('cardEditor.subtitle')}</p>
            )}
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
            <button type="button" onClick={handleBatchClick} className="deck__button deck__button--primary" disabled={Boolean(waitingForSet)}>
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
                <button type="button" onClick={handleAIBulkClick} className="deck__button deck__button--ai">
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
            {user ? (
              // Con sesión todo está guardado: salir no borra nada.
              <Link to="/dashboard#mis-loterias" className="deck__link">
                {t('cardEditor.deck.goToMine')}
              </Link>
            ) : (
              <button type="button" onClick={onCancel} className="deck__link">
                {t('cardEditor.deck.exit')}
              </button>
            )}
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
              <CardUploadThumb onSingleClick={() => !waitingForSet && setIsUploadModalOpen(true)} />
            </div>
            {cards.map((card) => (
              <CardPreview
                key={card.id}
                card={card}
                onRemove={removeCard}
                onRevert={user ? handleRevertCard : undefined}
                onTransform={user ? handleSingleAI : undefined}
                disableTransformButton={!!(user && (isCardRecentlySynced(card.id) || noTokensForSingle))}
                onClick={handleEditCard}
                disabledDuringBatch={isAIBatchProcessing && cardsToTransformIds.has(card.id)}
                isTransforming={transformingCardId === card.id}
              />
            ))}
          </div>

          <button
            type="button"
            className={`deck__dropzone deck__wide-only ${isDraggingFiles ? 'deck__dropzone--over' : ''}`}
            onClick={handleBatchClick}
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

      <CardUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onCardAdd={handleCardAdd}
        existingTitles={cards.map(card => card.title)}
      />

      <UploadProgressModal isOpen={showUploadProgress} progress={uploadProgress} />

      {liveEditingCard && (
        <CardEditModal
          key={liveEditingCard.id}
          card={liveEditingCard}
          totalCards={cards.length}
          otherTitles={cards.filter(card => card.id !== liveEditingCard.id).map(card => card.title)}
          onClose={() => setEditingCard(null)}
          onSave={async (updates) => Boolean(await updateCard(liveEditingCard.id, updates))}
          onGenerate={user ? handleSingleAI : undefined}
          tokenBalance={tokenBalance}
          aiBlockedNote={isCardRecentlySynced(liveEditingCard.id) ? t('cardEditor.syncingMessage') : undefined}
        />
      )}

      <BatchUploadModal
        isOpen={isBatchModalOpen}
        onClose={() => {
          setIsBatchModalOpen(false);
          setBatchFiles([]);
        }}
        onCardsAdd={handleBatchCardsAdd}
        files={batchFiles}
        existingTitles={cards.map(card => card.title)}
      />

      <AIBatchModal
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        onCloseAndContinue={() => { batchModalClosedDuringProcessingRef.current = true; }}
        cards={cardsToTransform}
        allCards={cards}
        batchCardIds={aiBatchCardIds}
        onStart={(limit) => handleAIStart(limit)}
        status={aiBatchStatus}
        currentIndex={aiBatchCurrentIndex}
        skippedCount={aiBatchSkippedCount}
        error={aiBatchError}
        tokenBalance={tokenBalance}
      />

      <input
        ref={batchInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        multiple
        onChange={handleBatchFileSelect}
        style={{ display: 'none' }}
      />

      <WarningModal
        isOpen={isClearModalOpen}
        title={t('modals.clearCards.title')}
        message={t('modals.clearCards.message')}
        confirmText={t('modals.clearCards.confirm')}
        onConfirm={handleClearCards}
        onCancel={() => setIsClearModalOpen(false)}
        type="danger"
      />

      <WarningModal
        isOpen={showAllTransformedModal}
        title={t('common.success')}
        message={t('aiBatchModal.allAlreadyTransformed')}
        confirmText={t('common.close')}
        onConfirm={() => setShowAllTransformedModal(false)}
        onCancel={() => setShowAllTransformedModal(false)}
        singleButton
      />

      {aiErrorMessage && (
        <div
          className="card-editor__ai-error-overlay"
          onClick={() => setAiErrorMessage(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="card-editor-ai-error-title"
        >
          <div className="card-editor__ai-error-modal" onClick={(e) => e.stopPropagation()}>
            <div className="card-editor__ai-error-icon">
              <FaExclamationTriangle />
            </div>
            <h2 id="card-editor-ai-error-title" className="card-editor__ai-error-title">
              {t('common.warning')}
            </h2>
            <p className="card-editor__ai-error-message">{aiErrorMessage}</p>
            <button
              type="button"
              className="card-editor__ai-error-close"
              onClick={() => setAiErrorMessage(null)}
            >
              {t('common.close')}
            </button>
          </div>
        </div>
      )}

      {showBatchCompleteMessage && (
        <div
          className="card-editor__batch-complete-overlay"
          onClick={() => setShowBatchCompleteMessage(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="card-editor-batch-complete-title"
        >
          <div className="card-editor__batch-complete-modal" onClick={(e) => e.stopPropagation()}>
            <div className="card-editor__batch-complete-icon">
              <FaCheckCircle />
            </div>
            <h2 id="card-editor-batch-complete-title" className="card-editor__batch-complete-title">
              {aiBatchTotalCount - aiBatchSkippedCount > 0
                ? t('aiBatchModal.done', { count: aiBatchTotalCount - aiBatchSkippedCount })
                : t('aiBatchModal.doneNone')}
            </h2>
            <p className="card-editor__batch-complete-message">
              {t('aiBatchModal.revertHint')}
            </p>
            {aiBatchSkippedCount > 0 && (
              <p className="card-editor__batch-complete-skipped">
                {t('aiBatchModal.rejected', { count: aiBatchSkippedCount })}{' '}
                {t('aiBatchModal.refunded', { count: aiBatchSkippedCount })}
              </p>
            )}
            <button
              type="button"
              className="card-editor__batch-complete-close"
              onClick={() => setShowBatchCompleteMessage(false)}
            >
              {t('common.close')}
            </button>
          </div>
        </div>
      )}
    </div >
  );
};
