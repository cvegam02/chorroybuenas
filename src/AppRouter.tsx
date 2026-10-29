import { Routes, Route, useNavigate, useLocation, Navigate, matchPath } from 'react-router-dom';
import { useState, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { LandingPage } from './components/LandingPage/LandingPage';
import { CardEditor } from './components/CardEditor/CardEditor';
import { BoardCountSelector } from './components/BoardGenerator/BoardCountSelector';
import { BoardPreview } from './components/BoardGenerator/BoardPreview';
import { ConfirmationModal } from './components/ConfirmationModal/ConfirmationModal';
import { WarningModal } from './components/ConfirmationModal/WarningModal';
import { HowToPlay } from './components/HowToPlay/HowToPlay';
import { AboutLoteria } from './components/AboutLoteria/AboutLoteria';
import { TraditionalBoardsPage } from './components/TraditionalBoards/TraditionalBoardsPage';
import { JoinLoteriaPage } from './components/JoinLoteria/JoinLoteriaPage';
import { GuestLoteriaPage } from './components/GuestLoteria/GuestLoteriaPage';
import { PrivacyNotice } from './components/PrivacyNotice/PrivacyNotice';
import BenefitsPage from './components/BenefitsPage/BenefitsPage';
import { SetView } from './components/SetView/SetView';
import { CallerPage } from './components/Caller/CallerPage';
import { BuyTokensPage } from './components/BuyTokens/BuyTokensPage';
import { SeasonalCatalog } from './components/Seasonal/SeasonalCatalog';
import { SeasonalDetail } from './components/Seasonal/SeasonalDetail';
import { Dashboard } from './components/Dashboard/Dashboard';
import { AdminPanel } from './components/AdminPanel/AdminPanel';
import { SeasonalWizard } from './components/AdminPanel/SeasonalWizard/SeasonalWizard';
import { Navbar } from './components/Navbar/Navbar';
import { PageMeta } from './components/PageMeta/PageMeta';
import { CreateSteps } from './components/CreateSteps/CreateSteps';
import { Footer } from './components/Footer/Footer';
import { SetNewPasswordModal } from './components/Auth/SetNewPasswordModal';
import { useAuth } from './contexts/AuthContext';
import { useSetContext } from './contexts/SetContext';
import { SetRepository } from './repositories/SetRepository';
import { useBoard } from './hooks/useBoard';
import { CardRepository } from './repositories/CardRepository';
import { useCards } from './hooks/useCards';
import { generatePDF, downloadPDF, pdfFileName } from './services/PDFService';
import { withLiveCards } from './utils/boardIntegrity';
import { saveBoards, saveBoardCount, loadBoards, clearAllData } from './utils/storage';
import { useVisitorTransfer } from './hooks/useVisitorTransfer';
import { UploadProgressModal } from './components/CardEditor/UploadProgressModal';
import { BoardRepository } from './repositories/BoardRepository';
import { Board, GridSize } from './types';
import { logger } from './utils/logger';
import { pdfErrorMessage } from './utils/pdfErrorMessage';
import { CardLabelsProvider } from './contexts/CardLabelsContext';
import { useCardLabelsChoice } from './hooks/useCardLabelsChoice';

type AppStep = 'cards' | 'board-count' | 'preview' | 'confirmation';

const LEGACY_SEASONAL_PATH = /^\/temporada/;

/** `/temporada` fue la dirección de `/tematicas` (FEAT-24): redirige conservando ficha y parámetros. */
function LegacySeasonalRedirect() {
  const { pathname, search } = useLocation();
  return <Navigate to={{ pathname: pathname.replace(LEGACY_SEASONAL_PATH, '/tematicas'), search }} replace />;
}

function AppContent() {
  const { t } = useTranslation();
  const { user, recoverySession, isLoading: authLoading } = useAuth();
  /**
   * Crear (C1 → C2 → C3) es solo para visitantes: con sesión, cada lotería se trabaja en su página (U2) y estas
   * direcciones llevan a «Mis loterías» (FEAT-57).
   */
  const visitorOnly = (element: ReactNode) => {
    if (authLoading) return null;
    return user ? <Navigate to={{ pathname: '/dashboard', hash: '#mis-loterias' }} replace /> : element;
  };
  const { currentSetId, sets, setSets } = useSetContext();
  const { cards } = useCards();
  const navigate = useNavigate();
  const location = useLocation();
  // El cantador ocupa toda la pantalla: sin la barra del sitio ni el pie (FEAT-55)
  const isCallerPage = matchPath('/loteria/:setId/cantar', location.pathname) !== null;
  const [currentStep, setCurrentStep] = useState<AppStep | null>(null);
  const [boards, setBoards] = useState<Board[]>([]);
  const [, setBoardCount] = useState<number>(8);
  const [gridSize, setGridSize] = useState<GridSize>(16); // Default to 4x4 (Classic)
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showShuffleModal, setShowShuffleModal] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  // El estado tarda un render en llegar: la referencia frena una segunda pulsación inmediata.
  const isGeneratingPDFRef = useRef(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const { generateBoards, isGenerating } = useBoard();
  const visitorTransfer = useVisitorTransfer();
  const { labels: cardLabels, changeLabels: changeCardLabels } = useCardLabelsChoice();

  // Initialize step based on current route
  useEffect(() => {
    if (location.pathname === '/cards' && currentStep !== 'cards') {
      setCurrentStep('cards');
    } else if (location.pathname === '/board-count' && currentStep !== 'board-count') {
      setCurrentStep('board-count');
    } else if (location.pathname === '/preview' && currentStep !== 'preview') {
      setCurrentStep('preview');
    }
  }, [location.pathname, currentStep]);

  // Sync gridSize when entering /cards: prioridad set del contexto (incluye cambios del usuario), luego state de navegación
  useEffect(() => {
    if (location.pathname === '/cards') {
      if (currentSetId) {
        const set = sets.find(s => s.id === currentSetId);
        if (set?.grid_size != null) {
          setGridSize(set.grid_size);
          return;
        }
      }
      const fromState = (location.state as { gridSize?: GridSize })?.gridSize;
      if (fromState != null) {
        setGridSize(fromState);
      }
    }
  }, [location.pathname, currentSetId, sets, location.state]);

  // Sync gridSize from location.state when entering /board-count (e.g. from SetView)
  useEffect(() => {
    if (location.pathname === '/board-count' && location.state?.gridSize != null) {
      setGridSize(location.state.gridSize as GridSize);
    }
  }, [location.pathname, location.state]);

  // Sin sesión, en «Cartas» se sueltan los tableros de la vista previa: si se borra una carta que está en ellos, se
  // borran (FEAT-60); al volver a la vista previa se cargan otra vez del navegador, si siguen ahí.
  useEffect(() => {
    if (location.pathname === '/cards' && !user) setBoards([]);
  }, [location.pathname, user]);

  // Cargar tableros al refrescar en /preview (evita quedarse en "Redirigiendo...")
  useEffect(() => {
    if (location.pathname !== '/preview' || boards.length > 0 || authLoading) return;

    let cancelled = false;
    const loadAndRedirect = async () => {
      if (user) {
        if (!currentSetId) return; // Esperar a que SetContext cargue
        try {
          const cloudBoards = await BoardRepository.getBoards(user.id, currentSetId);
          if (cancelled) return;
          if (cloudBoards?.length > 0) {
            setBoards(cloudBoards);
          } else {
            navigate('/cards', { replace: true });
          }
        } catch (e) {
          logger.error('Error loading preview boards:', e);
          if (!cancelled) navigate('/cards', { replace: true });
        }
      } else {
        try {
          const localBoards = await loadBoards();
          if (cancelled) return;
          if (localBoards && localBoards.length > 0) {
            setBoards(localBoards);
          } else {
            navigate('/cards', { replace: true });
          }
        } catch (e) {
          if (!cancelled) navigate('/cards', { replace: true });
        }
      }
    };
    loadAndRedirect();
    return () => { cancelled = true; };
  }, [location.pathname, boards.length, user, currentSetId, authLoading, navigate]);

  const handleCardsNext = async () => {
    if (user && currentSetId) {
      try {
        const updated = await SetRepository.updateSet(currentSetId, user.id, { grid_size: gridSize });
        setSets(prev => prev.map(s => s.id === currentSetId ? { ...s, grid_size: updated.grid_size } : s));
      } catch (err) {
        logger.error('Error saving grid size:', err);
      }
    }
    setCurrentStep('board-count');
    navigate('/board-count');
  };

  const handleBoardCountGenerate = async (count: number, size: GridSize = gridSize) => {
    setBoardCount(count);
    try {
      // Pass gridSize to generateBoards if supported, otherwise it defaults to what logic?
      // actually generateBoards hook needs to be updated or we need to pass gridSize to it.
      // useBoard hook likely needs update too if it doesn't handle gridSize yet.
      // Checking useBoard hook usage... it's just `generateBoards(count)`.
      // We need to pass gridSize to generateBoards inside the hook, or pass it here.
      // Let's assume for now keeping existing signature and we'll fix useBoard in next steps if needed,
      // but waaaait, the previous task updated useBoard/PDFService.
      // Let's check useBoard usage again.
      const generatedBoards = await generateBoards(count, size);
      setBoards(generatedBoards);
      await saveBoards(generatedBoards, count);
      saveBoardCount(count);
      setCurrentStep('preview');
      // Al revolver ya se está en la vista previa: no se agrega otra entrada al historial.
      if (location.pathname !== '/preview') navigate('/preview');
    } catch (error) {
      logger.error('Error generating boards:', error);
      const errorMessage = error instanceof Error ? error.message : t('common.error');
      alert(`${t('boardGenerator.errors.generateError')}: ${errorMessage}. ${t('boardGenerator.errors.tryAgain')}`);
    }
  };

  const handlePreviewModify = () => {
    setPdfError(null);
    setCurrentStep('cards');
    navigate('/cards');
  };

  /** «Revolver tableros» (FEAT-34, US A5): la misma cantidad y el mismo modo, con otro acomodo. */
  const shuffleBoards = () => handleBoardCountGenerate(boards.length, boards[0]?.gridSize ?? gridSize);

  const handlePreviewRegenerate = () => {
    setPdfError(null);
    // Con sesión los tableros están guardados en la lotería: se confirma antes de reemplazarlos.
    if (user) {
      setShowShuffleModal(true);
      return;
    }
    shuffleBoards();
  };

  const confirmShuffle = () => {
    setShowShuffleModal(false);
    shuffleBoards();
  };

  // Las cartas de un tablero son copias: cada casilla muestra la carta como está ahora en la lotería (FEAT-60, US A3).
  const boardsWithHydratedImages = useMemo(() => withLiveCards(boards, cards), [boards, cards]);

  const handlePreviewConfirm = async () => {
    if (isGeneratingPDFRef.current) return;
    isGeneratingPDFRef.current = true;
    setPdfError(null);
    setIsGeneratingPDF(true);
    try {
      // Con sesión, la baraja se lee de la lotería en este momento: `cards` se cargó al abrirla y no ve
      // las cartas agregadas después en la pantalla de cartas.
      const deckCards = user && currentSetId ? await CardRepository.getCards(user.id, currentSetId) : undefined;
      // La lotería del visitante sin sesión no tiene nombre: su archivo lleva el nombre por defecto.
      const setName = user && currentSetId ? sets.find(s => s.id === currentSetId)?.name : undefined;
      const pdfBlob = await generatePDF(boardsWithHydratedImages, {
        ...(deckCards ? { allCards: deckCards } : {}),
        title: setName,
        cardLabels,
      });
      downloadPDF(pdfBlob, pdfFileName(setName));
      setShowConfirmation(true);
    } catch (error) {
      logger.error('Error generating PDF:', error);
      setPdfError(pdfErrorMessage(error, t));
    } finally {
      isGeneratingPDFRef.current = false;
      setIsGeneratingPDF(false);
    }
  };

  const handleConfirmationComplete = async () => {
    await clearAllData();
    setCurrentStep(null);
    setBoards([]);
    setBoardCount(8);
    setGridSize(16); // Reset to default
    setShowConfirmation(false);
    navigate('/');
    // Force reload to clear any component state
    window.location.reload();
  };

  const handleLandingStart = () => {
    setCurrentStep('cards');
    navigate('/cards');
  };

  const handleConfirmationModify = () => {
    setShowConfirmation(false);
    setCurrentStep('cards');
    navigate('/cards');
  };

  const handleCancelProcess = () => {
    setShowCancelModal(true);
  };

  const confirmCancel = async () => {
    await clearAllData();
    setCurrentStep(null);
    setBoards([]);
    setBoardCount(8);
    setGridSize(16);
    setShowCancelModal(false);
    navigate('/');
    window.location.reload();
  };

  return (
    <>
      <PageMeta />
      {!isCallerPage && <Navbar />}
      {!isCallerPage && <CreateSteps />}
      <UploadProgressModal
        isOpen={visitorTransfer.isSaving}
        progress={visitorTransfer.progress}
        title={t('visitorTransfer.saving')}
      />
      <Routes>
        <Route
          path="/"
          element={
            user ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <LandingPage onStart={handleLandingStart} />
            )
          }
        />
        <Route
          path="/dashboard"
          element={<Dashboard />}
        />
        <Route
          path="/admin"
          element={<AdminPanel />}
        />
        <Route
          path="/admin/ofertas/:offerId"
          element={<AdminPanel />}
        />
        <Route
          path="/admin/tematicas/:id"
          element={<SeasonalWizard />}
        />
        <Route
          path="/beneficios"
          element={<BenefitsPage />}
        />
        <Route
          path="/como-se-juega"
          element={<HowToPlay />}
        />
        <Route
          path="/privacidad"
          element={<PrivacyNotice />}
        />
        <Route
          path="/que-es-la-loteria"
          element={<AboutLoteria />}
        />
        <Route
          path="/arma-tus-tableros"
          element={<TraditionalBoardsPage />}
        />
        <Route
          path="/arma-tus-tableros/:gameId"
          element={<TraditionalBoardsPage />}
        />
        <Route
          path="/unirse/:codigo"
          element={<JoinLoteriaPage />}
        />
        <Route
          path="/tematicas"
          element={<SeasonalCatalog />}
        />
        <Route
          path="/tematicas/:id"
          element={<SeasonalDetail />}
        />
        <Route
          path="/temporada/*"
          element={<LegacySeasonalRedirect />}
        />
        <Route
          path="/crear"
          element={<Navigate to="/cards" replace />}
        />
        <Route
          path="/loteria/:setId"
          element={<SetView />}
        />
        <Route
          path="/participo/:setId"
          element={<GuestLoteriaPage />}
        />
        <Route
          path="/loteria/:setId/cantar"
          element={<CallerPage />}
        />
        <Route
          path="/comprar-tokens"
          element={<BuyTokensPage />}
        />
        <Route
          path="/cards"
          element={visitorOnly(
            <CardLabelsProvider value={cardLabels}>
              <CardEditor
                onNext={handleCardsNext}
                onCancel={handleCancelProcess}
                gridSize={gridSize}
                onGridSizeChange={setGridSize}
                cardLabels={cardLabels}
                onCardLabelsChange={changeCardLabels}
              />
            </CardLabelsProvider>
          )}
        />
        <Route
          path="/board-count"
          element={visitorOnly(
            <CardLabelsProvider value={cardLabels}>
              <BoardCountSelector
                onGenerate={handleBoardCountGenerate}
                onBack={handlePreviewModify}
                gridSize={gridSize}
              />
            </CardLabelsProvider>
          )}
        />
        <Route
          path="/preview"
          element={visitorOnly(
            boards.length > 0 ? (
              <CardLabelsProvider value={cardLabels}>
                <BoardPreview
                  boards={boardsWithHydratedImages}
                  onModify={handlePreviewModify}
                  onConfirm={handlePreviewConfirm}
                  onRegenerate={handlePreviewRegenerate}
                  error={pdfError}
                />
              </CardLabelsProvider>
            ) : (
              <div style={{ padding: '48px', textAlign: 'center' }}>
                <h2>{t('common.loading')}</h2>
                <button onClick={() => navigate('/cards')} className="btn btn--primary" style={{ marginTop: 16 }}>
                  {t('common.back')}
                </button>
              </div>
            )
          )}
        />
      </Routes>

      {!isCallerPage && <Footer />}

      {isGenerating && (
        <div className="app__loading" role="status" aria-live="polite">
          <div className="app__loading-spinner"></div>
          <p>{t('boardGenerator.status.generatingBoards')}</p>
        </div>
      )}

      {isGeneratingPDF && (
        <div className="app__loading" role="status" aria-live="polite">
          <div className="app__loading-spinner"></div>
          <p>{t('boardGenerator.status.generatingPDF')}</p>
        </div>
      )}

      {showConfirmation && (
        <ConfirmationModal
          boardCount={boards.length}
          onClose={() => setShowConfirmation(false)}
          onComplete={handleConfirmationComplete}
          onModify={handleConfirmationModify}
        />
      )}

      <WarningModal
        isOpen={showShuffleModal}
        title={t('modals.regenerateBoards.title')}
        message={t('modals.regenerateBoards.message')}
        confirmText={t('modals.regenerateBoards.confirm')}
        cancelText={t('modals.regenerateBoards.cancel')}
        onConfirm={confirmShuffle}
        onCancel={() => setShowShuffleModal(false)}
      />

      <WarningModal
        isOpen={showCancelModal}
        title={t('modals.batchCancel.title')}
        message={t('modals.batchCancel.message')}
        confirmText={t('modals.batchCancel.confirm')}
        cancelText={t('modals.batchCancel.cancel')}
        onConfirm={confirmCancel}
        onCancel={() => setShowCancelModal(false)}
        type="danger"
      />

      {recoverySession && <SetNewPasswordModal />}
    </>
  );
}

export default AppContent;
