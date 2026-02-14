import { useState, useRef, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FaInfoCircle,
  FaChevronDown,
  FaCheckCircle,
  FaUpload,
  FaArrowRight,
  FaImage,
  FaEdit,
  FaTag,
  FaPlus,
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
import { SetRepository } from '../../repositories/SetRepository';
import { AIBatchModal } from './AIBatchModal';
import { WarningModal } from '../ConfirmationModal/WarningModal';
import { AIService } from '../../services/AIService';
import { adjustImageToCardAspectRatio } from '../../utils/imageUtils';
import { Card, GridSize } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useSetContext } from '../../contexts/SetContext';
import { useTokenBalance } from '../../contexts/TokenContext';
import './CardEditor.css';

interface CardEditorProps {
  onNext: () => void;
  onCancel: () => void;
  gridSize: GridSize;
  onGridSizeChange: (size: GridSize) => void;
}

export const CardEditor = ({ onNext, onCancel, gridSize, onGridSizeChange }: CardEditorProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { sets, currentSetId, setSets } = useSetContext();
  const { balance: tokenBalance, refreshBalance } = useTokenBalance();
  const currentSet = sets.find(s => s.id === currentSetId);
  const { cards, addCard, addCards, removeCard, updateCard, clearCards, cardCount, isCardRecentlySynced } = useCards();
  /** Usuario logueado sin lotería seleccionada: esperar a que SetContext cargue o crear una. */
  const waitingForSet = user && !currentSetId;
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  const [isInstructionsCollapsed, setIsInstructionsCollapsed] = useState(true);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [batchFiles, setBatchFiles] = useState<File[]>([]);
  const batchInputRef = useRef<HTMLInputElement>(null);
  const batchModalClosedDuringProcessingRef = useRef(false);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  /** Mensaje de error de IA (modal en UI; evita alert() suprimido por el navegador). Fase 3: solo mensaje genérico, sin CTA. */
  const [aiErrorMessage, setAiErrorMessage] = useState<string | null>(null);
  const [showUploadProgress, setShowUploadProgress] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(-1);
  const [showAllTransformedModal, setShowAllTransformedModal] = useState(false);
  const [aiBatchStatus, setAiBatchStatus] = useState<'idle' | 'processing' | 'complete' | 'error'>('idle');
  const [aiBatchCurrentIndex, setAiBatchCurrentIndex] = useState(0);
  const [aiBatchSkippedCount, setAiBatchSkippedCount] = useState(0);
  const [aiBatchError, setAiBatchError] = useState<string | null>(null);
  const [showBatchCompleteMessage, setShowBatchCompleteMessage] = useState(false);
  /** ID de la carta en transformación individual; mantiene el overlay visible hasta que termine */
  const [transformingCardId, setTransformingCardId] = useState<string | null>(null);

  // Dynamic minimum cards based on grid size
  // Kids (3x3) -> Min 12
  // Classic (4x4) -> Min 20
  const minCards = gridSize === 9 ? 12 : 20;
  const hasMinimumCards = cardCount >= minCards;
  const cardsToTransform = useMemo(() => cards.filter(c => !c.isAiGenerated), [cards]);
  const cardsToTransformIds = useMemo(() => new Set(cardsToTransform.map(c => c.id)), [cardsToTransform]);
  const isAIBatchProcessing = aiBatchStatus === 'processing';
  const noTokensForSingle = user && tokenBalance !== null && tokenBalance < 1;
  const noTokensForBulk = user && tokenBalance !== null && tokenBalance < cardsToTransform.length;

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
      id: crypto.randomUUID(),
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
      id: crypto.randomUUID(),
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

  const handleBatchFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      setBatchFiles(files);
      setIsBatchModalOpen(true);
    }
    // Reset input so same files can be selected again
    if (batchInputRef.current) {
      batchInputRef.current.value = '';
    }
  };

  const handleClearCards = async () => {
    await clearCards();
    setIsUploadModalOpen(false);
    setIsBatchModalOpen(false);
    setBatchFiles([]);
    setIsClearModalOpen(false);
  };

  const handleEditCard = (card: Card) => {
    setEditingCard(card);
  };

  const handleUpdateCard = async (image: string, title: string) => {
    if (!editingCard) return false;

    // Check for duplicates (excluding current card)
    const normalizedTitle = normalizeTitle(title);
    const isDuplicate = cards.some(c =>
      c.id !== editingCard.id && normalizeTitle(c.title) === normalizedTitle
    );

    if (isDuplicate) {
      alert(t('cardEditor.errors.duplicateTitle'));
      return false;
    }

    const success = await updateCard(editingCard.id, { image, title });
    if (success) {
      setEditingCard(null);
    }
    return success;
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

  const handleSingleAI = async (card: Card) => {
    const imageToProcess = card.originalImage || card.image || '';
    if (!imageToProcess.trim()) {
      alert(t('cardEditor.errors.generalAddError'));
      return;
    }
    setTransformingCardId(card.id);
    await updateCard(card.id, { isProcessing: true });

    try {
      const transformedImage = await AIService.transformToLoteria(
        {
          image: imageToProcess,
          prompt_strength: 0.30
        },
        user?.id,
        { onSensitiveRetry: () => {} },
        currentSetId ?? undefined
      );

      const normalizedImage = await adjustImageToCardAspectRatio(transformedImage, 512, 768, 0.9);

      await updateCard(card.id, {
        image: normalizedImage,
        originalImage: card.originalImage || card.image,
        isAiGenerated: true,
        isProcessing: false
      });
      refreshBalance();
    } catch (error: any) {
      const errMsg = error?.message ?? String(error ?? '');
      console.error('[CardEditor] Admin: fallo transformación individual (causa real para admin):', errMsg, error);
      setAiErrorMessage(t('cardEditor.errors.genericContactAdmin'));
      await updateCard(card.id, { isProcessing: false });
    } finally {
      setTransformingCardId(null);
    }
  };

  const runAIBatchTransformation = async (cardsToProcess: Card[]) => {
    setAiBatchStatus('processing');
    setAiBatchSkippedCount(0);
    setAiBatchError(null);
    const strength = 0.30;

    for (let i = 0; i < cardsToProcess.length; i++) {
      setAiBatchCurrentIndex(i);
      const card = cardsToProcess[i];

      await updateCard(card.id, { isProcessing: true });

      try {
        const transformedImage = await AIService.transformToLoteria(
          { image: card.image || '', prompt_strength: strength },
          user?.id,
          { onSensitiveRetry: () => {} },
          currentSetId ?? undefined
        );

        const normalizedImage = await adjustImageToCardAspectRatio(transformedImage, 512, 768, 0.9);

        await updateCard(card.id, {
          image: normalizedImage,
          originalImage: card.originalImage || card.image,
          isAiGenerated: true,
          isProcessing: false
        });
      } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : String(error ?? '');
        const isSensitiveContent =
          errMsg === 'SENSITIVE_CONTENT_FILTER' ||
          errMsg === 'SENSITIVE_PHOTO_NOT_SUPPORTED' ||
          /sensitive|e005|content.?filter/i.test(errMsg);

        if (isSensitiveContent) {
          setAiBatchSkippedCount(prev => prev + 1);
          await updateCard(card.id, { isProcessing: false });
        } else {
          console.error('[CardEditor] AI batch error:', errMsg, error);
          setAiBatchStatus('error');
          setAiBatchError(t('cardEditor.errors.genericContactAdmin'));
          setAiErrorMessage(t('cardEditor.errors.genericContactAdmin'));
          await updateCard(card.id, { isProcessing: false });
          return;
        }
      }

      if (i < cardsToProcess.length - 1) {
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    setAiBatchStatus('complete');
    setAiBatchCurrentIndex(0);
    refreshBalance();
    if (batchModalClosedDuringProcessingRef.current) {
      setShowBatchCompleteMessage(true);
      batchModalClosedDuringProcessingRef.current = false;
    }
  };

  const handleAIStart = () => {
    runAIBatchTransformation(cardsToTransform);
  };

  useEffect(() => {
    if (isAIModalOpen && aiBatchStatus !== 'processing') {
      setAiBatchStatus('idle');
      setAiBatchCurrentIndex(0);
      setAiBatchSkippedCount(0);
      setAiBatchError(null);
      batchModalClosedDuringProcessingRef.current = false;
    }
  }, [isAIModalOpen]);

  useEffect(() => {
    if (!isAIBatchProcessing) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isAIBatchProcessing]);

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
      console.error('Error renaming set:', err);
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
        .catch((err) => console.error('Error saving grid size:', err));
    }
  };

  const handleAIBulkClick = () => {
    if (cardsToTransform.length === 0) {
      setShowAllTransformedModal(true);
      return;
    }
    if (noTokensForBulk) return;
    setIsAIModalOpen(true);
  };

  return (
    <div className="card-editor">
      <aside className="card-editor__sidebar">
        <div className="card-editor__header">
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
                <h1 className="card-editor__title">{currentSet.name}</h1>
                <button type="button" className="card-editor__rename-btn" onClick={handleRenameStart} aria-label={t('setView.renameSet')} title={t('setView.renameSet')}>
                  <FaPencilAlt />
                </button>
              </div>
            )
          ) : (
            <h1 className="card-editor__title">{t('cardEditor.title')}</h1>
          )}
          <p className="card-editor__subtitle">{t('cardEditor.subtitle')}</p>
        </div>

        <div className="card-editor__sidebar-section">
          <GridModeSelector selectedSize={gridSize} onChange={handleGridSizeChange} t={t} />
        </div>

        <div className="card-editor__stats">
          <div className="card-editor__stat">
            <div className="card-editor__stat-value">
              {cardCount}
              {hasMinimumCards && <FaCheckCircle className="card-editor__stat-check" />}
            </div>
            <div className="card-editor__stat-label">{t('cardEditor.stats.loaded')}</div>
            {!hasMinimumCards && (
              <div className="card-editor__stat-minimum">
                {t('cardEditor.stats.minimum', { mode: gridSize === 9 ? 'Kids' : 'Clásico', min: minCards })}
              </div>
            )}
          </div>
          {user && (
            <div className="card-editor__stat card-editor__stat--tokens">
              <div className="card-editor__stat-value">{tokenBalance ?? '...'}</div>
              <div className="card-editor__stat-label">{t('landing.benefits.feature3.title')}</div>
              <button
                className="card-editor__refresh-tokens"
                onClick={() => refreshBalance()}
                title="Actualizar balance"
              >
                🔄
              </button>
            </div>
          )}
        </div>

        <div className="card-editor__info-section">
              <button
                className={`card-editor__info-toggle ${!isInstructionsCollapsed ? 'card-editor__info-toggle--open' : ''}`}
                onClick={() => setIsInstructionsCollapsed(!isInstructionsCollapsed)}
                type="button"
              >
                <div className="card-editor__info-toggle-content">
                  <FaInfoCircle className="card-editor__info-icon" />
                  <span className="card-editor__info-title">{t('cardEditor.instructions.title')}</span>
                </div>
                <FaChevronDown className={`card-editor__info-chevron ${isInstructionsCollapsed ? '' : 'card-editor__info-chevron--open'}`} />
              </button>
              <div className={`card-editor__info-content ${isInstructionsCollapsed ? 'card-editor__info-content--collapsed' : ''}`}>
                <div className="card-editor__steps">
                  <div className="card-editor__step">
                    <div className="card-editor__step-number">1</div>
                    <div className="card-editor__step-content">
                      <div className="card-editor__step-icon"><FaImage /></div>
                      <div>
                        <strong>{t('cardEditor.instructions.step1.title')}</strong>
                        <p>{t('cardEditor.instructions.step1.text')}</p>
                      </div>
                    </div>
                  </div>
                  <div className="card-editor__step">
                    <div className="card-editor__step-number">2</div>
                    <div className="card-editor__step-content">
                      <div className="card-editor__step-icon"><FaEdit /></div>
                      <div>
                        <strong>{t('cardEditor.instructions.step2.title')}</strong>
                        <p>{t('cardEditor.instructions.step2.text')}</p>
                      </div>
                    </div>
                  </div>
                  <div className="card-editor__step">
                    <div className="card-editor__step-number">3</div>
                    <div className="card-editor__step-content">
                      <div className="card-editor__step-icon"><FaTag /></div>
                      <div>
                        <strong>{t('cardEditor.instructions.step3.title')}</strong>
                        <p>{t('cardEditor.instructions.step3.text')}</p>
                      </div>
                    </div>
                  </div>
                  <div className="card-editor__step">
                    <div className="card-editor__step-number">4</div>
                    <div className="card-editor__step-content">
                      <div className="card-editor__step-icon"><FaPlus /></div>
                      <div>
                        <strong>{t('cardEditor.instructions.step4.title')}</strong>
                        <p>{t('cardEditor.instructions.step4.text')}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

        <div className="card-editor__actions">
          {hasMinimumCards && (
            <button onClick={onNext} className="card-editor__next-button card-editor__next-button--enabled">
              <span>{t('cardEditor.actions.nextStep')}</span>
              <FaArrowRight />
            </button>
          )}
        </div>

        <div className="card-editor__sidebar-actions">
          <button type="button" onClick={handleBatchClick} className="card-editor__batch-button" disabled={Boolean(waitingForSet)}>
            <FaUpload />
            <span>{t('cardEditor.actions.uploadBatch')}</span>
          </button>
          {cardCount > 0 && (
            <button
              type="button"
              onClick={() => !isAIBatchProcessing && setIsClearModalOpen(true)}
              className="card-editor__clear-button"
              disabled={Boolean(isAIBatchProcessing)}
              title={isAIBatchProcessing ? t('cardEditor.batchProcessingBlockClear') : undefined}
            >
              {t('cardEditor.actions.clearAll')}
            </button>
          )}
          <button type="button" onClick={onCancel} className="card-editor__cancel-process-button">
            {t('cardEditor.actions.cancelProcess')}
          </button>
        </div>
      </aside>

      <main className="card-editor__main">
        {waitingForSet && (
          <div className="card-editor__waiting-banner" role="status">
            <div className="spinner" style={{ width: 24, height: 24, borderWidth: 2 }} />
            <span>{t('common.loading')}</span>
          </div>
        )}
        <div className="card-editor__cards-toolbar">
          {cards.length > 0 && (
            <>
              <div className="card-editor__cards-header-left">
                <h2 className="card-editor__cards-title">{t('cardEditor.cardsList.title')}</h2>
                <span className="card-editor__cards-count">({cardCount})</span>
                {!hasMinimumCards && (
                  <span className="card-editor__cards-missing">
                    {t('cardEditor.cardsList.missing', { count: minCards - cardCount })}
                  </span>
                )}
              </div>
              {cardCount > 0 && (
                user ? (
                  <button
                    type="button"
                    onClick={handleAIBulkClick}
                    className="card-editor__ai-bulk-button card-editor__ai-bulk-button--toolbar"
                    disabled={!!noTokensForBulk}
                    title={noTokensForBulk ? t('aiBatchModal.insufficientTokens', { needed: cardsToTransform.length, have: tokenBalance ?? 0, missing: cardsToTransform.length - (tokenBalance ?? 0) }) : undefined}
                  >
                    <FaMagic />
                    <span>{t('cardEditor.actions.aiBulkTransform')}</span>
                  </button>
                ) : (
                  <span className="card-editor__login-to-use-ai" title={t('cardEditor.loginToUseAI')}>
                    {t('cardEditor.loginToUseAI')}
                  </span>
                )
              )}
            </>
          )}
        </div>

        <div className="card-editor__cards-wrapper">
          <div className="card-editor__cards-grid">
            {cards.map((card) => (
              <CardPreview
                key={card.id}
                card={card}
                onRemove={removeCard}
                onRevert={handleRevertCard}
                onTransform={user ? handleSingleAI : undefined}
                disableTransformButton={!!(user && (isCardRecentlySynced(card.id) || noTokensForSingle))}
                transformButtonTitle={noTokensForSingle ? t('cardEditor.noTokensForTransform') : undefined}
                onClick={handleEditCard}
                disabledDuringBatch={isAIBatchProcessing && cardsToTransformIds.has(card.id)}
                isTransforming={transformingCardId === card.id}
              />
            ))}
            <CardUploadThumb onSingleClick={() => !waitingForSet && setIsUploadModalOpen(true)} />
          </div>
        </div>

        <div className="card-editor__mobile-actions">
          <button type="button" onClick={handleBatchClick} className="card-editor__batch-button" disabled={Boolean(waitingForSet)}>
            <FaUpload />
            <span>{t('cardEditor.actions.uploadBatch')}</span>
          </button>
          {cardCount > 0 && (
            <button
              type="button"
              onClick={() => !isAIBatchProcessing && setIsClearModalOpen(true)}
              className="card-editor__clear-button"
              disabled={Boolean(isAIBatchProcessing)}
              title={isAIBatchProcessing ? t('cardEditor.batchProcessingBlockClear') : undefined}
            >
              {t('cardEditor.actions.clearAll')}
            </button>
          )}
          <button type="button" onClick={onCancel} className="card-editor__cancel-process-button">
            {t('cardEditor.actions.cancelProcess')}
          </button>
        </div>

        {hasMinimumCards && (
          <div className="card-editor__main-next">
            <button onClick={onNext} className="card-editor__next-button card-editor__next-button--enabled">
              <span>{t('cardEditor.actions.nextStep')}</span>
              <FaArrowRight />
            </button>
          </div>
        )}
      </main>

      <CardUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onCardAdd={handleCardAdd}
        existingTitles={cards.map(card => card.title)}
      />

      <UploadProgressModal isOpen={showUploadProgress} progress={uploadProgress} />

      {editingCard && (
        <CardEditModal
          isOpen={!!editingCard}
          onClose={() => setEditingCard(null)}
          onCardUpdate={handleUpdateCard}
          existingTitles={cards.map(card => card.title)}
          initialTitle={editingCard.title}
          initialImage={editingCard.image || ''}
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
        totalCards={cards.length}
        onStart={handleAIStart}
        status={aiBatchStatus}
        currentIndex={aiBatchCurrentIndex}
        skippedCount={aiBatchSkippedCount}
        error={aiBatchError}
        tokenBalance={tokenBalance}
        hasEnoughTokens={user ? (tokenBalance !== null && tokenBalance >= cardsToTransform.length) : true}
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
              {t('aiBatchModal.complete')}
            </h2>
            <p className="card-editor__batch-complete-message">
              {t('aiBatchModal.batchCompleteBackground')}
            </p>
            {aiBatchSkippedCount > 0 && (
              <p className="card-editor__batch-complete-skipped">
                ⚠️ {t('aiBatchModal.skippedMessage', { count: aiBatchSkippedCount })}
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
