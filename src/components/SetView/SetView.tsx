import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FaEdit, FaDownload, FaArrowLeft, FaPencilAlt, FaTrash, FaPlus, FaSync } from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import { useSetContext } from '../../contexts/SetContext';
import { useCards } from '../../hooks/useCards';
import { useBoard } from '../../hooks/useBoard';
import { SetRepository, type LoteriaSet } from '../../repositories/SetRepository';
import { TokenPricingRepository } from '../../repositories/TokenPricingRepository';
import { BoardThumbnail } from '../BoardGenerator/BoardThumbnail';
import { BoardModal } from '../BoardGenerator/BoardModal';
import { CardPreviewModal } from './CardPreviewModal';
import { WarningModal } from '../ConfirmationModal/WarningModal';
import { generatePDF, downloadPDF } from '../../services/PDFService';
import { Card, GridSize } from '../../types';
import './SetView.css';

export const SetView = () => {
  const { setId } = useParams<{ setId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, isLoading: authLoading } = useAuth();
  const { sets, setSets, currentSetId, setCurrentSetId } = useSetContext();
  const { cards, isLoading: cardsLoading } = useCards();
  const { boards, clearBoards, isGenerating } = useBoard();
  const [selectedBoardIndex, setSelectedBoardIndex] = useState<number | null>(null);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [showClearBoardsModal, setShowClearBoardsModal] = useState(false);
  const [showRegenerateBoardsModal, setShowRegenerateBoardsModal] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  const [tokensSpentInSet, setTokensSpentInSet] = useState<number | null>(null);
  const [fetchedSet, setFetchedSet] = useState<LoteriaSet | null>(null);

  useEffect(() => {
    if (setId) {
      setCurrentSetId(setId);
    }
  }, [setId, setCurrentSetId]);

  // Si el set no está en la lista (ej. carga directa por URL), cargarlo individualmente
  useEffect(() => {
    if (!setId || !user) return;
    const s = sets.find(x => x.id === setId);
    if (s) {
      setFetchedSet(null);
      return;
    }
    let cancelled = false;
    SetRepository.getSet(setId, user.id).then((data) => {
      if (!cancelled) setFetchedSet(data ?? null);
    });
    return () => { cancelled = true; };
  }, [setId, user?.id, sets]);

  useEffect(() => {
    if (user && setId) {
      TokenPricingRepository.getTokensSpentForSet(user.id, setId).then(setTokensSpentInSet);
    } else {
      setTokensSpentInSet(null);
    }
  }, [user, setId]);

  useEffect(() => {
    if (authLoading) return;
    if (user === null && !setId) return;
    if (user === null) {
      navigate('/', { replace: true });
    }
  }, [authLoading, user, setId, navigate]);

  const set = sets.find(s => s.id === setId) ?? fetchedSet ?? null;
  const setName = set?.name ?? setId ?? t('setView.defaultSetName');
  const isSynced = Boolean(setId && currentSetId === setId);

  /** grid_size del set: 9 (3x3 Kids) o 16 (4x4 Classic). Desde DB (set) o tableros existentes. */
  const gridSize: GridSize = set?.grid_size ?? (boards.length > 0 ? (boards[0].gridSize ?? 16) : 16);
  const hasReliableGridSize = set?.grid_size != null || boards.length > 0;
  /** Mínimo de cartas para poder generar tableros: 12 (Kids) o 16 (Classic). */
  const minCardsForBoards = gridSize === 9 ? 12 : 16;
  const hasEnoughCardsForBoards = cards.length >= minCardsForBoards;

  /** Tableros con cartas que usan las imágenes ya hidratadas (IndexedDB) para que se vean al instante. */
  const boardsWithHydratedImages = useMemo(() => {
    return boards.map((board) => ({
      ...board,
      cards: board.cards.map((boardCard) => {
        const hydratedCard = cards.find((c) => c.id === boardCard.id);
        return {
          ...boardCard,
          image: hydratedCard?.image ?? boardCard.image,
        };
      }),
    }));
  }, [boards, cards]);

  const handleEditCards = () => navigate('/cards', { state: { gridSize } });

  const handleRenameStart = () => {
    setRenameValue(set?.name ?? '');
    setIsRenaming(true);
  };

  const handleRenameSave = async () => {
    const name = renameValue.trim();
    if (!name || !setId || !user) return;
    if (name === set?.name) {
      setIsRenaming(false);
      return;
    }
    setIsSavingName(true);
    try {
      const updated = await SetRepository.updateSet(setId, user.id, { name });
      setSets(prev => prev.map(s => (s.id === setId ? { ...s, name: updated.name } : s)));
      setIsRenaming(false);
    } catch (err) {
      console.error('Error renaming set:', err);
      alert(t('common.error'));
    } finally {
      setIsSavingName(false);
    }
  };

  const handleRenameCancel = () => {
    setRenameValue(set?.name ?? '');
    setIsRenaming(false);
  };

  const handleDownloadPDF = async () => {
    if (boards.length === 0) return;
    setIsGeneratingPDF(true);
    try {
      const blob = await generatePDF(boards, { allCards: cards });
      downloadPDF(blob);
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert(t('boardGenerator.errors.pdfError'));
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleGenerateBoards = () => navigate('/board-count', { state: { gridSize } });

  const handleGenerateNewBoardsClick = () => setShowRegenerateBoardsModal(true);

  const handleConfirmRegenerateBoards = async () => {
    try {
      await clearBoards();
      setSelectedBoardIndex(null);
      setShowRegenerateBoardsModal(false);
      navigate('/board-count', { state: { gridSize } });
    } catch (err) {
      console.error('Error clearing boards before regenerate:', err);
      alert(t('common.error'));
    }
  };

  const handleClearBoardsClick = () => setShowClearBoardsModal(true);

  const handleConfirmClearBoards = async () => {
    try {
      await clearBoards();
      setSelectedBoardIndex(null);
      setShowClearBoardsModal(false);
    } catch (err) {
      console.error('Error clearing boards:', err);
      alert(t('common.error'));
    }
  };

  if (authLoading) {
    return (
      <div className="set-view">
        <div className="set-view__loading">
          <div className="set-view__spinner" />
          <p>{t('common.loading')}</p>
        </div>
      </div>
    );
  }
  if (!user) return null;
  if (!setId) {
    navigate('/', { replace: true });
    return null;
  }

  return (
    <div className="set-view">
      <header className="set-view__header">
        <button
          type="button"
          className="set-view__back"
          onClick={() => navigate('/')}
          aria-label={t('common.back')}
        >
          <FaArrowLeft />
          <span>{t('setView.backToHome')}</span>
        </button>
        {isRenaming ? (
          <div className="set-view__rename">
            <input
              type="text"
              className="set-view__rename-input"
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
            <div className="set-view__rename-actions">
              <button
                type="button"
                className="set-view__btn set-view__btn--secondary set-view__btn--small"
                onClick={handleRenameCancel}
                disabled={isSavingName}
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                className="set-view__btn set-view__btn--primary set-view__btn--small"
                onClick={handleRenameSave}
                disabled={isSavingName || !renameValue.trim()}
              >
                {isSavingName ? t('common.loading') : t('common.save')}
              </button>
            </div>
          </div>
        ) : (
          <div className="set-view__title-row">
            <h1 className="set-view__title">{setName}</h1>
            <button
              type="button"
              className="set-view__rename-btn"
              onClick={handleRenameStart}
              aria-label={t('setView.renameSet')}
              title={t('setView.renameSet')}
            >
              <FaPencilAlt />
            </button>
          </div>
        )}
      </header>

      {(!isSynced || cardsLoading) ? (
        <div className="set-view__loading">
          <div className="set-view__spinner" />
          <p>{user ? t('setView.loadingCards') : t('common.loading')}</p>
        </div>
      ) : (
        <>
          <section className="set-view__section">
            <div className="set-view__section-header">
              <h2 className="set-view__section-title">{t('setView.cardsTitle')}</h2>
              <div className="set-view__section-meta">
                <span className="set-view__count">{t('setView.cardCount', { count: cards.length })}</span>
                {tokensSpentInSet != null && tokensSpentInSet > 0 && (
                  <span className="set-view__tokens-spent">{t('setView.tokensSpentInSet', { count: tokensSpentInSet })}</span>
                )}
              </div>
            </div>
            {cards.length === 0 ? (
              <p className="set-view__empty">{t('setView.noCards')}</p>
            ) : (
              <div className="set-view__cards-grid">
                {cards.slice(0, 24).map((card) => (
                  <button
                    key={card.id}
                    type="button"
                    className="set-view__card-thumb set-view__card-thumb--clickable"
                    onClick={() => setSelectedCard(card)}
                  >
                    {card.image ? (
                      <img src={card.image} alt={card.title} className="set-view__card-img" />
                    ) : (
                      <div className="set-view__card-placeholder">{t('setView.noImage')}</div>
                    )}
                    <span className="set-view__card-title">{card.title}</span>
                  </button>
                ))}
                {cards.length > 24 && (
                  <div className="set-view__card-more">+{cards.length - 24}</div>
                )}
              </div>
            )}
            <button type="button" className="set-view__btn set-view__btn--secondary" onClick={handleEditCards}>
              <FaEdit />
              <span>{t('setView.editCards')}</span>
            </button>
          </section>

          <section className="set-view__section">
            <div className="set-view__section-header">
              <h2 className="set-view__section-title">{t('setView.boardsTitle')}</h2>
              <span className="set-view__count">{t('setView.boardCount', { count: boards.length })}</span>
            </div>
            {boards.length === 0 ? (
              <p className="set-view__empty">{t('setView.noBoards')}</p>
            ) : (
              <div className="set-view__boards-wrapper">
                <div className="set-view__boards-container">
                  {boardsWithHydratedImages.map((board, index) => (
                    <BoardThumbnail
                      key={board.id}
                      board={board}
                      index={index}
                      onClick={() => setSelectedBoardIndex(index)}
                    />
                  ))}
                </div>
              </div>
            )}
            {hasReliableGridSize && !hasEnoughCardsForBoards && cards.length > 0 && (
              <div className="set-view__insufficient-cards" role="alert">
                <p className="set-view__insufficient-cards-title">{t('boardGenerator.insufficientCards.title')}</p>
                <p className="set-view__insufficient-cards-text">
                  {t('boardGenerator.insufficientCards.text', {
                    needed: minCardsForBoards,
                    mode: gridSize === 9 ? t('boardGenerator.modes.kids') : t('boardGenerator.modes.classic'),
                    count: cards.length
                  })}
                </p>
              </div>
            )}
            <div className="set-view__actions">
              {boards.length === 0 ? (
                <button
                  type="button"
                  className="set-view__btn set-view__btn--primary"
                  onClick={handleGenerateBoards}
                  disabled={isGenerating || !hasEnoughCardsForBoards}
                  title={!hasEnoughCardsForBoards ? t('boardGenerator.insufficientCards.title') : undefined}
                >
                  <FaPlus />
                  <span>{t('setView.generateBoards')}</span>
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className="set-view__btn set-view__btn--primary"
                    onClick={handleDownloadPDF}
                    disabled={isGeneratingPDF}
                  >
                    <FaDownload />
                    <span>{t('setView.downloadPDF')}</span>
                  </button>
                  <button
                    type="button"
                    className="set-view__btn set-view__btn--secondary"
                    onClick={handleGenerateNewBoardsClick}
                    disabled={isGenerating}
                  >
                    <FaSync />
                    <span>{t('setView.generateNewBoards')}</span>
                  </button>
                  <button
                    type="button"
                    className="set-view__btn set-view__btn--secondary"
                    onClick={handleClearBoardsClick}
                    disabled={isGenerating}
                  >
                    <FaTrash />
                    <span>{t('setView.clearBoards')}</span>
                  </button>
                </>
              )}
            </div>
          </section>

          {selectedCard && (
            <CardPreviewModal
              card={selectedCard}
              isOpen={!!selectedCard}
              onClose={() => setSelectedCard(null)}
            />
          )}

          {selectedBoardIndex !== null && (
            <BoardModal
              boards={boardsWithHydratedImages}
              selectedIndex={selectedBoardIndex}
              isOpen={true}
              onClose={() => setSelectedBoardIndex(null)}
              onChangeIndex={setSelectedBoardIndex}
            />
          )}
        </>
      )}

      {(isGenerating || isGeneratingPDF) && (
        <div className="set-view__overlay">
          <div className="set-view__spinner" />
          <p>
            {isGeneratingPDF
              ? t('boardGenerator.status.generatingPDF')
              : t('boardGenerator.status.generatingBoards')}
          </p>
        </div>
      )}

      <WarningModal
        isOpen={showClearBoardsModal}
        title={t('modals.clearBoards.title')}
        message={t('modals.clearBoards.message')}
        confirmText={t('modals.clearBoards.confirm')}
        cancelText={t('modals.clearBoards.cancel')}
        onConfirm={handleConfirmClearBoards}
        onCancel={() => setShowClearBoardsModal(false)}
        type="danger"
      />

      <WarningModal
        isOpen={showRegenerateBoardsModal}
        title={t('modals.regenerateBoards.title')}
        message={t('modals.regenerateBoards.message')}
        confirmText={t('modals.regenerateBoards.confirm')}
        cancelText={t('modals.regenerateBoards.cancel')}
        onConfirm={handleConfirmRegenerateBoards}
        onCancel={() => setShowRegenerateBoardsModal(false)}
        type="danger"
      />
    </div>
  );
};
