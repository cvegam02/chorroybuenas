import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FaRegWindowClose } from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import { useSetContext } from '../../contexts/SetContext';
import { useCards } from '../../hooks/useCards';
import { useCardLabelsChoice } from '../../hooks/useCardLabelsChoice';
import { useDeckEditing } from '../CardEditor/useDeckEditing';
import { DeckDialogs } from '../CardEditor/DeckDialogs';
import { SetCardSettingsDialog } from './SetCardSettingsDialog';
import { useBoard } from '../../hooks/useBoard';
import { useGuestCardsLive } from '../../hooks/useGuestCardsLive';
import { useOwnerGuestCards } from '../../hooks/useOwnerGuestCards';
import { useLoteriaSharing } from '../../hooks/useLoteriaSharing';
import { SetRepository, type LoteriaSet } from '../../repositories/SetRepository';
import { TokenPricingRepository } from '../../repositories/TokenPricingRepository';
import { BoardModal } from '../BoardGenerator/BoardModal';
import { BoardCountSelector } from '../BoardGenerator/BoardCountSelector';
import { AuthDialog } from '../Auth/AuthDialog';
import { CardPreviewModal } from './CardPreviewModal';
import { SetBoardsSection } from './SetBoardsSection';
import { SetCardsSection } from './SetCardsSection';
import { SetConfirmDialog } from './SetConfirmDialog';
import { PdfProgressDialog } from './PdfProgressDialog';
import { SetHeader } from './SetHeader';
import { InviteDialog } from './InviteDialog';
import { LoteriaInviteRepository } from '../../repositories/LoteriaInviteRepository';
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
import { cardLabelsOrDefault, type CardLabels } from '../../utils/cardLabels';
import { CardLabelsProvider } from '../../contexts/CardLabelsContext';

export const SetView = () => {
  const { setId } = useParams<{ setId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, isLoading: authLoading } = useAuth();
  const { sets, setSets, refreshSets, currentSetId, setCurrentSetId } = useSetContext();
  const cardsApi = useCards();
  const { cards, isLoading: cardsLoading, refreshFromCloud } = cardsApi;
  // Las cartas se editan aquí mismo, con las mismas ventanas que C1 (FEAT-57)
  const deck = useDeckEditing(cardsApi);
  const { labels: cardLabels, changeLabels } = useCardLabelsChoice();
  const [showSettings, setShowSettings] = useState(false);
  const [labelsError, setLabelsError] = useState(false);
  const { boards, clearBoards, isBoardsLoading, generateBoards, isGenerating } = useBoard();
  const [selectedBoardIndex, setSelectedBoardIndex] = useState<number | null>(null);
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [showClearBoardsModal, setShowClearBoardsModal] = useState(false);
  // Ventana para elegir cuántos tableros: armarlos por primera vez o revolverlos (FEAT-57)
  const [boardsDialog, setBoardsDialog] = useState<'build' | 'shuffle' | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [tokensSpentInSet, setTokensSpentInSet] = useState<number | null>(null);
  const [fetchedSet, setFetchedSet] = useState<LoteriaSet | null>(null);
  const [isCollective, setIsCollective] = useState(false);
  // M18: el enlace y, si ya es colectiva, quiénes participan (FEAT-57, US A4)
  const [isInviteOpen, setIsInviteOpen] = useState(false);

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

  // «Colectiva» si la lotería ya tiene enlace para invitar (FEAT-56)
  useEffect(() => {
    if (!setId || !userId) return;
    let cancelled = false;
    LoteriaInviteRepository.listCollectiveSetIds()
      .then((ids) => {
        if (!cancelled) setIsCollective(ids.has(setId));
      })
      .catch((err) => logger.error('Error loading loteria invites:', err));
    return () => { cancelled = true; };
  }, [setId, userId]);

  const loteriaSharing = useLoteriaSharing(setId, isCollective);

  // Quién subió cada carta y cuáles son nuevas; las fotos de los invitados aparecen solas (FEAT-56)
  const guestCards = useOwnerGuestCards(setId, isCollective);
  const refreshGuestCards = guestCards.refresh;
  useGuestCardsLive(setId, isCollective, () => {
    void refreshFromCloud();
    refreshGuestCards();
    // Una foto nueva puede ser de alguien que acaba de unirse: «Compartida · N» se vuelve a contar, una vez por tanda
    loteriaSharing.refreshSoon();
  });

  useEffect(() => {
    if (authLoading) return;
    if (user === null && !setId) return;
    if (user === null) {
      navigate('/', { replace: true });
    }
  }, [authLoading, user, setId, navigate]);

  // «Armar tableros» desde Mi cuenta abre la ventana de tableros al llegar (FEAT-57)
  const location = useLocation();
  const openBoardsOnArrival = (location.state as { openBoards?: boolean } | null)?.openBoards === true;

  const set = sets.find(s => s.id === setId) ?? fetchedSet ?? null;
  const setName = set?.name ?? t('setView.defaultSetName');
  const isSynced = Boolean(setId && currentSetId === setId);

  /** grid_size del set: 9 (3x3 Kids) o 16 (4x4 Classic). Desde DB (set) o tableros existentes. */
  const gridSize: GridSize = set?.grid_size ?? (boards.length > 0 ? (boards[0].gridSize ?? 16) : 16);
  const isLoaded = isSynced && !cardsLoading && !isBoardsLoading;
  useEffect(() => {
    if (!openBoardsOnArrival || !isLoaded) return;
    if (boards.length === 0) setBoardsDialog('build');
    navigate(location.pathname, { replace: true, state: null });
  }, [openBoardsOnArrival, isLoaded, boards.length, navigate, location.pathname]);

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

  /** Tipo de lotería desde «Ajustes»; solo sin tableros, que son de un tipo. */
  const changeGridSize = async (size: GridSize) => {
    if (!setId || !user || boards.length > 0 || size === gridSize) return;
    try {
      const updated = await SetRepository.updateSet(setId, user.id, { grid_size: size });
      setSets(prev => prev.map(s => (s.id === setId ? { ...s, grid_size: updated.grid_size } : s)));
      setFetchedSet(prev => (prev ? { ...prev, grid_size: updated.grid_size } : prev));
    } catch (err) {
      logger.error('Error saving grid size:', err);
      alert(t('common.error'));
    }
  };

  const changeCardLabels = async (labels: CardLabels) => {
    setLabelsError(false);
    setLabelsError(!(await changeLabels(labels)));
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

  /** Arma los tableros elegidos en la ventana; los de antes se reemplazan. */
  const handleGenerateBoards = async (count: number, size: GridSize) => {
    try {
      await generateBoards(count, size);
      setSelectedBoardIndex(null);
      setBoardsDialog(null);
    } catch (err) {
      logger.error('Error generating boards:', err);
      const message = err instanceof Error ? err.message : t('common.error');
      alert(`${t('boardGenerator.errors.generateError')}: ${message}. ${t('boardGenerator.errors.tryAgain')}`);
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
    <CardLabelsProvider value={cardLabels}>
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
                  isCollective,
                  newPhotoCount: cards.filter((card) => guestCards.newCardIds.has(card.id)).length,
                  sharing: loteriaSharing.sharing,
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
          onInvite={() => setIsInviteOpen(true)}
          onAddPhotos={deck.openFilePicker}
          onShuffleBoards={() => setBoardsDialog('shuffle')}
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
            <SetStatusNotice
              state={viewState}
              cardCount={cards.length}
              boardCount={boards.length}
              onBuildBoards={() => setBoardsDialog('build')}
              onAddPhotos={deck.openFilePicker}
            />
            {pdfError && (
              <p className="set-view__error" role="alert">
                {pdfError}
              </p>
            )}

            <SetCardsSection
              state={viewState}
              deck={deck}
              members={guestCards.members}
              newCardIds={guestCards.newCardIds}
              onOpenCard={setSelectedCardIndex}
              onOpenSettings={() => setShowSettings(true)}
            />

            <SetBoardsSection
              boards={boardsWithHydratedImages}
              state={viewState}
              gridSize={gridSize}
              onOpenBoard={setSelectedBoardIndex}
              onShuffle={() => setBoardsDialog('shuffle')}
              onBuild={() => setBoardsDialog('build')}
            />

            {selectedCard && selectedCardIndex !== null && (
              <CardPreviewModal
                card={selectedCard}
                isOpen={true}
                onClose={() => setSelectedCardIndex(null)}
                navigation={{ index: selectedCardIndex, total: cards.length, onChange: setSelectedCardIndex }}
                onEdit={() => {
                  setSelectedCardIndex(null);
                  deck.handleEditCard(selectedCard);
                }}
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

        <DeckDialogs deck={deck} />

        {showSettings && (
          <SetCardSettingsDialog
            gridSize={gridSize}
            hasBoards={boards.length > 0}
            cardLabels={cardLabels}
            labelsError={labelsError}
            onGridSizeChange={changeGridSize}
            onCardLabelsChange={changeCardLabels}
            onClose={() => setShowSettings(false)}
          />
        )}

        {isGeneratingPDF && <PdfProgressDialog cards={cards} boardCount={boards.length} />}

        {boardsDialog && (
          <AuthDialog
            titleId="boards-dialog-title"
            onClose={() => !isGenerating && setBoardsDialog(null)}
            focusKey={boardsDialog}
            variant="tall"
          >
            <BoardCountSelector
              variant="dialog"
              titleId="boards-dialog-title"
              gridSize={gridSize}
              initialCount={boardsDialog === 'shuffle' ? boards.length : undefined}
              notice={boardsDialog === 'shuffle' ? t('setView.shuffleNotice', { count: boards.length }) : undefined}
              isGenerating={isGenerating}
              onGenerate={handleGenerateBoards}
              onBack={() => setBoardsDialog(null)}
            />
          </AuthDialog>
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

        {isInviteOpen && (
          <InviteDialog
            setId={setId}
            setName={setName}
            onInviteReady={() => setIsCollective(true)}
            onSharingChange={loteriaSharing.refresh}
            onClose={() => setIsInviteOpen(false)}
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
