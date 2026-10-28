import { useTranslation } from 'react-i18next';
import { FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import { CardUploadModal } from './CardUploadModal';
import { CardEditModal } from './CardEditModal';
import { BatchUploadModal } from './BatchUploadModal';
import { UploadProgressModal } from './UploadProgressModal';
import { AIBatchModal } from './AIBatchModal';
import { WarningModal } from '../ConfirmationModal/WarningModal';
import type { DeckEditing } from './useDeckEditing';
import './CardEditor.css';

interface DeckDialogsProps {
  deck: DeckEditing;
}

/** Las ventanas de subir, editar y transformar con IA de `useDeckEditing`, y el selector de archivos escondido. */
export const DeckDialogs = ({ deck }: DeckDialogsProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { cards, ai, liveEditingCard } = deck;
  const titles = cards.map(card => card.title);

  return (
    <>
      <CardUploadModal
        isOpen={deck.isUploadModalOpen}
        onClose={() => deck.setIsUploadModalOpen(false)}
        onCardAdd={deck.handleCardAdd}
        existingTitles={titles}
      />

      <UploadProgressModal isOpen={deck.showUploadProgress} progress={deck.uploadProgress} />

      {liveEditingCard && (
        <CardEditModal
          key={liveEditingCard.id}
          card={liveEditingCard}
          totalCards={cards.length}
          otherTitles={cards.filter(card => card.id !== liveEditingCard.id).map(card => card.title)}
          onClose={() => deck.setEditingCard(null)}
          onSave={async (updates) => Boolean(await deck.updateCard(liveEditingCard.id, updates))}
          onGenerate={user ? ai.handleSingleAI : undefined}
          tokenBalance={deck.tokenBalance}
          aiBlockedNote={deck.isCardRecentlySynced(liveEditingCard.id) ? t('cardEditor.syncingMessage') : undefined}
        />
      )}

      <BatchUploadModal
        isOpen={deck.isBatchModalOpen}
        onClose={deck.closeUploads}
        onCardsAdd={deck.handleBatchCardsAdd}
        files={deck.batchFiles}
        existingTitles={titles}
      />

      <AIBatchModal
        isOpen={deck.isAIModalOpen}
        onClose={() => deck.setIsAIModalOpen(false)}
        onCloseAndContinue={() => { ai.batchModalClosedDuringProcessingRef.current = true; }}
        cards={ai.cardsToTransform}
        allCards={cards}
        batchCardIds={ai.aiBatchCardIds}
        onStart={(limit) => ai.handleAIStart(limit)}
        status={ai.aiBatchStatus}
        currentIndex={ai.aiBatchCurrentIndex}
        skippedCount={ai.aiBatchSkippedCount}
        error={ai.aiBatchError}
        tokenBalance={deck.tokenBalance}
      />

      <input
        ref={deck.batchInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        multiple
        onChange={deck.handleBatchFileSelect}
        style={{ display: 'none' }}
      />

      <WarningModal
        isOpen={deck.showAllTransformedModal}
        title={t('common.success')}
        message={t('aiBatchModal.allAlreadyTransformed')}
        confirmText={t('common.close')}
        onConfirm={() => deck.setShowAllTransformedModal(false)}
        onCancel={() => deck.setShowAllTransformedModal(false)}
        singleButton
      />

      {ai.aiErrorMessage && (
        <div
          className="card-editor__ai-error-overlay"
          onClick={() => ai.setAiErrorMessage(null)}
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
            <p className="card-editor__ai-error-message">{ai.aiErrorMessage}</p>
            <button type="button" className="card-editor__ai-error-close" onClick={() => ai.setAiErrorMessage(null)}>
              {t('common.close')}
            </button>
          </div>
        </div>
      )}

      {ai.showBatchCompleteMessage && (
        <div
          className="card-editor__batch-complete-overlay"
          onClick={() => ai.setShowBatchCompleteMessage(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="card-editor-batch-complete-title"
        >
          <div className="card-editor__batch-complete-modal" onClick={(e) => e.stopPropagation()}>
            <div className="card-editor__batch-complete-icon">
              <FaCheckCircle />
            </div>
            <h2 id="card-editor-batch-complete-title" className="card-editor__batch-complete-title">
              {ai.aiBatchTotalCount - ai.aiBatchSkippedCount > 0
                ? t('aiBatchModal.done', { count: ai.aiBatchTotalCount - ai.aiBatchSkippedCount })
                : t('aiBatchModal.doneNone')}
            </h2>
            <p className="card-editor__batch-complete-message">{t('aiBatchModal.revertHint')}</p>
            {ai.aiBatchSkippedCount > 0 && (
              <p className="card-editor__batch-complete-skipped">
                {t('aiBatchModal.rejected', { count: ai.aiBatchSkippedCount })}{' '}
                {t('aiBatchModal.refunded', { count: ai.aiBatchSkippedCount })}
              </p>
            )}
            <button
              type="button"
              className="card-editor__batch-complete-close"
              onClick={() => ai.setShowBatchCompleteMessage(false)}
            >
              {t('common.close')}
            </button>
          </div>
        </div>
      )}
    </>
  );
};
