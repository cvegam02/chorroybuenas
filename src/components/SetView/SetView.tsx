import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FaRandom, FaRegWindowClose } from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import { useSetContext } from '../../contexts/SetContext';
import { useCards } from '../../hooks/useCards';
import { useBoard } from '../../hooks/useBoard';
import { SetRepository, type LoteriaSet } from '../../repositories/SetRepository';
import { TokenPricingRepository } from '../../repositories/TokenPricingRepository';
import { BoardModal } from '../BoardGenerator/BoardModal';
import { CardPreviewModal } from './CardPreviewModal';
import { SetBoardsSection } from './SetBoardsSection';
import { SetCardsSection } from './SetCardsSection';
import { SetConfirmDialog } from './SetConfirmDialog';
import { PdfProgressDialog } from './PdfProgressDialog';
import { SetHeader } from './SetHeader';
import { SetStatusNotice } from './SetStatusNotice';
import { setViewStateOf } from './setViewState';
import { DeleteLoteriaDialog } from '../Dashboard/LoteriaDialogs';
import { generatePDF, downloadPDF, pdfFileName } from '../../services/PDFService';
import { GridSize } from '../../types';
import './SetView.css';
import { logger } from '../../utils/logger';
import { pdfErrorMessage } from '../../utils/pdfErrorMessage';
import { enterFullscreen } from '../../utils/fullscreen';
import { withNumbersFrom } from '../../utils/cardNumbers';
import { cardLabelsOrDefault } from '../../utils/cardLabels';
import { CardLabelsProvider } from '../../contexts/CardLabelsContext';

export const SetView = () => {
  const { setId } = useParams<{ setId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, isLoading: authLoading } = useAuth();
  const { sets, setSets, refreshSets, currentSetId, setCurrentSetId } = useSetContext();
  const { cards, isLoading: cardsLoading } = useCards();
  const { boards, clearBoards, isBoardsLoading } = useBoard();
  const [selectedBoardIndex, setSelectedBoardIndex] = useState<number | null>(null);
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [showClearBoardsModal, setShowClearBoardsModal] = useState(false);
  const [showRegenerateBoardsModal, setShowRegenerateBoardsModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [tokensSpentInSet, setTokensSpentInSet] = useState<number | null>(null);
  const [fetchedSet, setFetchedSet] = useState<LoteriaSet | null>(null);

  useEffect(() => {
    if (setId) setCurrentSetId(setId);
  }, [setId, setCurrentSetId]);

  // Si el set no está en la lista (ej. carga directa por URL), cargarlo individualmente
  const userId = user?.id;
  useEffect(() => {
    if (!setId || !userId) return;
    const s = sets.find(x => x.id === setId);
    if (s) {
      setFetchedSet(null);
      return;
    }
    let cancelled = false;
    SetRepository.getSet(setId, userId).then((data) => {
      if (!cancelled) setFetchedSet(data ?? null);
    });
    return () => { cancelled = true; };
  }, [setId, userId, sets]);

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
  const setName = set?.name ?? t('setView.defaultSetName');
  const isSynced = Boolean(setId && currentSetId === setId);

  /** grid_size del set: 9 (3x3 Kids) o 16 (4x4 Classic). Desde DB (set) o tableros existentes. */
  const gridSize: GridSize = set?.grid_size ?? (boards.length > 0 ? (boards[0].gridSize ?? 16) : 16);
  const isLoaded = isSynced && !cardsLoading && !isBoardsLoading;
  const selectedCard = selectedCardIndex !== null ? cards[selectedCardIndex] ?? null : null;
  const viewState = setViewStateOf({ cardCount: cards.length, boardCount: boards.length, gridSize });

  /** Tableros con cartas que usan las imágenes ya hidratadas (IndexedDB) para que se vean al instante. */
  const boardsWithHydratedImages = useMemo(() => {
    return boards.map((board) => ({
      ...board,
      // Las cartas de un tablero son copias: toman de la lista su número y su imagen ya hidratada.
      cards: withNumbersFrom(board.cards, cards).map((boardCard) => {
        const hydratedCard = cards.find((c) => c.id === boardCard.id);
        return {
          ...boardCard,
          image: hydratedCard?.image ?? boardCard.image,
        };
      }),
    }));
  }, [boards, cards]);

  const renameSet = async (name: string) => {
    if (!setId || !user) return;
    const updated = await SetRepository.updateSet(setId, user.id, { name });
    setSets(prev => prev.map(s => (s.id === setId ? { ...s, name: updated.name } : s)));
  };

  const handleDownloadPDF = async () => {
    if (boards.length === 0) return;
    setPdfError(null);
    setIsGeneratingPDF(true);
    try {
      const blob = await generatePDF(boards, {
        allCards: cards,
        title: set?.name,
        cardLabels: cardLabelsOrDefault(set?.card_labels),
      });
      downloadPDF(blob, pdfFileName(set?.name));
    } catch (err) {
      logger.error('Error generating PDF:', err);
      setPdfError(pdfErrorMessage(err, t));
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleConfirmRegenerateBoards = async () => {
    try {
      await clearBoards();
      setSelectedBoardIndex(null);
      setShowRegenerateBoardsModal(false);
      navigate('/board-count', { state: { gridSize } });
    } catch (err) {
      logger.error('Error clearing boards before regenerate:', err);
      alert(t('common.error'));
    }
  };

  const handleConfirmClearBoards = async () => {
    try {
      await clearBoards();
      setSelectedBoardIndex(null);
      setShowClearBoardsModal(false);
    } catch (err) {
      logger.error('Error clearing boards:', err);
      alert(t('common.error'));
    }
  };

  /** Elimina la lotería con sus cartas, tableros e imágenes, igual que desde Mi cuenta, y regresa allá. */
  const deleteSet = async () => {
    if (!setId || !user) return;
    await SetRepository.deleteSetWithImages(setId, user.id);
    // Se quita de la lista y se sale en el mismo paso, para que esta página no se quede un momento sin su lotería
    setSets(prev => prev.filter(s => s.id !== setId));
    navigate('/dashboard#mis-loterias', { replace: true });
    // La lista se vuelve a pedir para que la lotería actual deje de ser la eliminada
    void refreshSets();
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
    <CardLabelsProvider value={cardLabelsOrDefault(set?.card_labels)}>
      <div className="set-view">
        <SetHeader
          name={setName}
          savedName={set?.name ?? ''}
          details={
            isLoaded
              ? {
                  gridSize,
                  cardCount: cards.length,
                  boardCount: boards.length,
                  tokensSpent: tokensSpentInSet,
                  state: viewState,
                }
              : null
          }
          thumbnailCard={cards[0]}
          isDownloading={isGeneratingPDF}
          onRename={renameSet}
          onDownload={handleDownloadPDF}
          onSing={() => {
            enterFullscreen();
            navigate(`/loteria/${setId}/cantar`);
          }}
          onShuffleBoards={() => setShowRegenerateBoardsModal(true)}
          onClearBoards={() => setShowClearBoardsModal(true)}
          onDelete={() => setShowDeleteDialog(true)}
        />

        {!isLoaded ? (
          <div className="set-view__loading">
            <div className="set-view__spinner" />
            <p>{user ? t('setView.loadingCards') : t('common.loading')}</p>
            {user && (
              <p className="set-view__loading-patience">{t('setView.loadingCardsPatience')}</p>
            )}
          </div>
        ) : (
          <div className="set-view__body">
            <SetStatusNotice state={viewState} gridSize={gridSize} cardCount={cards.length} boardCount={boards.length} />
            {pdfError && (
              <p className="set-view__error" role="alert">
                {pdfError}
              </p>
            )}

            <SetCardsSection cards={cards} state={viewState} gridSize={gridSize} onOpenCard={setSelectedCardIndex} />

            <SetBoardsSection
              boards={boardsWithHydratedImages}
              state={viewState}
              gridSize={gridSize}
              onOpenBoard={setSelectedBoardIndex}
              onShuffle={() => setShowRegenerateBoardsModal(true)}
            />

            {selectedCard && selectedCardIndex !== null && (
              <CardPreviewModal
                card={selectedCard}
                isOpen={true}
                onClose={() => setSelectedCardIndex(null)}
                navigation={{ index: selectedCardIndex, total: cards.length, onChange: setSelectedCardIndex }}
                onEdit={() => navigate('/cards', { state: { gridSize, editCardId: selectedCard.id } })}
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
          </div>
        )}

        {isGeneratingPDF && <PdfProgressDialog cards={cards} boardCount={boards.length} />}

        {showRegenerateBoardsModal && (
          <SetConfirmDialog
            icon={<FaRandom />}
            tone="primary"
            title={t('setView.shuffleConfirmTitle', { count: boards.length })}
            text={t('setView.shuffleConfirmText')}
            confirmLabel={t('setView.shuffleConfirmAction')}
            cancelLabel={t('common.cancel')}
            onConfirm={handleConfirmRegenerateBoards}
            onClose={() => setShowRegenerateBoardsModal(false)}
          />
        )}

        {showClearBoardsModal && (
          <SetConfirmDialog
            icon={<FaRegWindowClose />}
            tone="danger"
            title={t('setView.clearConfirmTitle', { count: boards.length })}
            text={t('setView.clearConfirmText', { count: cards.length })}
            confirmLabel={t('setView.clearConfirmAction')}
            cancelLabel={t('setView.clearConfirmCancel')}
            onConfirm={handleConfirmClearBoards}
            onClose={() => setShowClearBoardsModal(false)}
          />
        )}

        {showDeleteDialog && (
          <DeleteLoteriaDialog
            name={setName}
            cardCount={isLoaded ? cards.length : null}
            canDownload={isLoaded && viewState.kind === 'ready'}
            isDownloading={isGeneratingPDF}
            onDownload={handleDownloadPDF}
            onConfirm={deleteSet}
            onClose={() => setShowDeleteDialog(false)}
          />
        )}
      </div>
    </CardLabelsProvider>
  );
};
