import { useState, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FaInfoCircle,
  FaChevronDown,
  FaLightbulb,
  FaCheckCircle,
  FaUpload,
  FaArrowRight,
  FaImage,
  FaEdit,
  FaTag,
  FaPlus
} from 'react-icons/fa';
import { useCards } from '../../hooks/useCards';
import { CardPreview } from './CardPreview';
import { CardUploadThumb } from './CardUploadThumb';
import { CardUploadModal } from './CardUploadModal';
import { CardEditModal } from './CardEditModal';
import { BatchUploadModal } from './BatchUploadModal';
import { CardRecommendations } from '../Recommendations/CardRecommendations';
import { GridModeSelector } from '../BoardGenerator/GridModeSelector';
import { WarningModal } from '../ConfirmationModal/WarningModal';
import { Card, GridSize } from '../../types';
import './CardEditor.css';

interface CardEditorProps {
  onNext: () => void;
  onCancel: () => void;
  gridSize: GridSize;
  onGridSizeChange: (size: GridSize) => void;
}

export const CardEditor = ({ onNext, onCancel, gridSize, onGridSizeChange }: CardEditorProps) => {
  const { t } = useTranslation();
  const { cards, addCard, addCards, removeCard, updateCard, clearCards, cardCount } = useCards();
  const [nextCardId, setNextCardId] = useState(1);
  const [isRecommendationsCollapsed, setIsRecommendationsCollapsed] = useState(true);
  const [isInstructionsCollapsed, setIsInstructionsCollapsed] = useState(true);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [batchFiles, setBatchFiles] = useState<File[]>([]);
  const batchInputRef = useRef<HTMLInputElement>(null);
  const [editingCard, setEditingCard] = useState<Card | null>(null);

  // Dynamic minimum cards based on grid size
  // Kids (3x3) -> Min 15
  // Classic (4x4) -> Min 20
  const minCards = gridSize === 9 ? 15 : 20;
  const hasMinimumCards = cardCount >= minCards;

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
      id: `card-${nextCardId}-${Date.now()}`,
      title,
      image,
    };
    await addCard(newCard);
    setNextCardId(prev => prev + 1);
    return true;
  };

  const handleBatchCardsAdd = async (cardsToAdd: Array<{ image: string; title: string }>) => {
    console.log('handleBatchCardsAdd called with', cardsToAdd.length, 'cards'); // Debug log

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

    // Create all new cards with unique IDs
    const newCards: Card[] = cardsToAdd.map(({ image, title }, index) => ({
      id: `card-${nextCardId + index}-${Date.now()}-${Math.random()}`,
      title,
      image,
    }));

    // Add all cards at once using addCards function
    await addCards(newCards);

    // Update ID counter by the number of cards added
    setNextCardId(prev => prev + cardsToAdd.length);
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
    setNextCardId(1);
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

  return (
    <div className="card-editor">
      <div className="card-editor__header">
        <h1 className="card-editor__title">{t('cardEditor.title')}</h1>
        <p className="card-editor__subtitle">
          {t('cardEditor.subtitle')}
        </p>
      </div>

      <div className="card-editor__mode-selector-container">
        <GridModeSelector selectedSize={gridSize} onChange={onGridSizeChange} t={t} />
      </div>

      <div className="card-editor__stats">
        <div className="card-editor__stat">
          <div className="card-editor__stat-value">
            {cardCount}
            {hasMinimumCards && (
              <FaCheckCircle className="card-editor__stat-check" />
            )}
          </div>
          <div className="card-editor__stat-label">{t('cardEditor.stats.loaded')}</div>
          {!hasMinimumCards && (
            <div className="card-editor__stat-minimum">
              {t('cardEditor.stats.minimum', { mode: gridSize === 9 ? 'Kids' : 'Clásico', min: minCards })}
            </div>
          )}
        </div>
      </div>

      {cards.length === 0 && (
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
                  <div className="card-editor__step-icon">
                    <FaImage />
                  </div>
                  <div>
                    <strong>{t('cardEditor.instructions.step1.title')}</strong>
                    <p>{t('cardEditor.instructions.step1.text')}</p>
                  </div>
                </div>
              </div>
              <div className="card-editor__step">
                <div className="card-editor__step-number">2</div>
                <div className="card-editor__step-content">
                  <div className="card-editor__step-icon">
                    <FaEdit />
                  </div>
                  <div>
                    <strong>{t('cardEditor.instructions.step2.title')}</strong>
                    <p>{t('cardEditor.instructions.step2.text')}</p>
                  </div>
                </div>
              </div>
              <div className="card-editor__step">
                <div className="card-editor__step-number">3</div>
                <div className="card-editor__step-content">
                  <div className="card-editor__step-icon">
                    <FaTag />
                  </div>
                  <div>
                    <strong>{t('cardEditor.instructions.step3.title')}</strong>
                    <p>{t('cardEditor.instructions.step3.text')}</p>
                  </div>
                </div>
              </div>
              <div className="card-editor__step">
                <div className="card-editor__step-number">4</div>
                <div className="card-editor__step-content">
                  <div className="card-editor__step-icon">
                    <FaPlus />
                  </div>
                  <div>
                    <strong>{t('cardEditor.instructions.step4.title')}</strong>
                    <p>{t('cardEditor.instructions.step4.text')}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {cards.length === 0 && (
        <div className="card-editor__info-section">
          <button
            className={`card-editor__info-toggle ${!isRecommendationsCollapsed ? 'card-editor__info-toggle--open' : ''}`}
            onClick={() => setIsRecommendationsCollapsed(!isRecommendationsCollapsed)}
            type="button"
          >
            <div className="card-editor__info-toggle-content">
              <FaLightbulb className="card-editor__info-icon" />
              <span className="card-editor__info-title">{t('cardEditor.recommendations.title')}</span>
            </div>
            <FaChevronDown className={`card-editor__info-chevron ${isRecommendationsCollapsed ? '' : 'card-editor__info-chevron--open'}`} />
          </button>
          {!isRecommendationsCollapsed && (
            <div className="card-editor__info-content">
              <ul className="card-editor__recommendations-list">
                <li><strong>{t('cardEditor.recommendations.quality').split(':')[0]}:</strong>{t('cardEditor.recommendations.quality').split(':')[1]}</li>
                <li><strong>{t('cardEditor.recommendations.subject').split(':')[0]}:</strong>{t('cardEditor.recommendations.subject').split(':')[1]}</li>
                <li><strong>{t('cardEditor.recommendations.lighting').split(':')[0]}:</strong>{t('cardEditor.recommendations.lighting').split(':')[1]}</li>
                <li><strong>{t('cardEditor.recommendations.vibrant').split(':')[0]}:</strong>{t('cardEditor.recommendations.vibrant').split(':')[1]}</li>
                <li><strong>{t('cardEditor.recommendations.composition').split(':')[0]}:</strong>{t('cardEditor.recommendations.composition').split(':')[1]}</li>
                <li><strong>{t('cardEditor.recommendations.descriptive').split(':')[0]}:</strong>{t('cardEditor.recommendations.descriptive').split(':')[1]}</li>
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="card-editor__cards-section">
        <div className="card-editor__cards-header">
          <div className="card-editor__cards-header-left">
            {cards.length > 0 && (
              <>
                <h2 className="card-editor__cards-title">{t('cardEditor.cardsList.title')}</h2>
                <span className="card-editor__cards-count">({cardCount})</span>
                {!hasMinimumCards && (
                  <span className="card-editor__cards-missing">
                    {t('cardEditor.cardsList.missing', { count: minCards - cardCount })}
                  </span>
                )}
              </>
            )}
          </div>
          <div className="card-editor__cards-header-right">
            <button
              type="button"
              onClick={handleBatchClick}
              className="card-editor__batch-button"
            >
              <FaUpload />
              <span>{t('cardEditor.actions.uploadBatch')}</span>
            </button>
            {cardCount > 0 && (
              <button
                type="button"
                onClick={() => setIsClearModalOpen(true)}
                className="card-editor__clear-button"
              >
                {t('cardEditor.actions.clearAll')}
              </button>
            )}
          </div>
        </div>
        <div className="card-editor__cards-grid">
          {cards.map((card) => (
            <CardPreview
              key={card.id}
              card={card}
              onRemove={removeCard}
              onClick={handleEditCard}
            />
          ))}
          <CardUploadThumb
            onSingleClick={() => setIsUploadModalOpen(true)}
          />
        </div>
        {cards.length > 0 && (
          <CardRecommendations cardCount={cardCount} />
        )}
      </div>

      <CardUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onCardAdd={handleCardAdd}
        existingTitles={cards.map(card => card.title)}
      />

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

      <div className="card-editor__actions">
        {hasMinimumCards && (
          <button
            onClick={onNext}
            className="card-editor__next-button card-editor__next-button--enabled"
          >
            <span>{t('cardEditor.actions.nextStep')}</span>
            <FaArrowRight />
          </button>
        )}
        <button
          type="button"
          onClick={onCancel}
          className="card-editor__cancel-process-button"
        >
          {t('cardEditor.actions.cancelProcess')}
        </button>
      </div>
    </div>
  );
};
