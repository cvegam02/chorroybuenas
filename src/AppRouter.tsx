import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { LandingPage } from './components/LandingPage/LandingPage';
import { CardEditor } from './components/CardEditor/CardEditor';
import { BoardCountSelector } from './components/BoardGenerator/BoardCountSelector';
import { BoardPreview } from './components/BoardGenerator/BoardPreview';
import { ConfirmationModal } from './components/ConfirmationModal/ConfirmationModal';
import { WarningModal } from './components/ConfirmationModal/WarningModal';
import { HowToPlay } from './components/HowToPlay/HowToPlay';
import { AboutLoteria } from './components/AboutLoteria/AboutLoteria';
import BenefitsPage from './components/BenefitsPage/BenefitsPage';
import { SetView } from './components/SetView/SetView';
import { BuyTokensPage } from './components/BuyTokens/BuyTokensPage';
import { Dashboard } from './components/Dashboard/Dashboard';
import { AdminPanel } from './components/AdminPanel/AdminPanel';
import { Navbar } from './components/Navbar/Navbar';
import { Footer } from './components/Footer/Footer';
import { SetNewPasswordModal } from './components/Auth/SetNewPasswordModal';
import { useAuth } from './contexts/AuthContext';
import { useSetContext } from './contexts/SetContext';
import { SetRepository } from './repositories/SetRepository';
import { useBoard } from './hooks/useBoard';
import { useCards } from './hooks/useCards';
import { generatePDF, downloadPDF } from './services/PDFService';
import { saveBoards, saveBoardCount, clearAllData } from './utils/storage';
import { Board, GridSize } from './types';

type AppStep = 'cards' | 'board-count' | 'preview' | 'confirmation';

function AppContent() {
  const { t } = useTranslation();
  const { user, recoverySession } = useAuth();
  const { currentSetId, sets, setSets } = useSetContext();
  const { cards } = useCards();
  const navigate = useNavigate();
  const location = useLocation();
  const [currentStep, setCurrentStep] = useState<AppStep | null>(null);
  const [boards, setBoards] = useState<Board[]>([]);
  const [, setBoardCount] = useState<number>(8);
  const [gridSize, setGridSize] = useState<GridSize>(16); // Default to 4x4 (Classic)
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const { generateBoards, isGenerating } = useBoard();

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

  const handleCardsNext = async () => {
    if (user && currentSetId) {
      try {
        const updated = await SetRepository.updateSet(currentSetId, user.id, { grid_size: gridSize });
        setSets(prev => prev.map(s => s.id === currentSetId ? { ...s, grid_size: updated.grid_size } : s));
      } catch (err) {
        console.error('Error saving grid size:', err);
      }
    }
    setCurrentStep('board-count');
    navigate('/board-count');
  };

  const handleBoardCountGenerate = async (count: number) => {
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
      const generatedBoards = await generateBoards(count, gridSize);
      setBoards(generatedBoards);
      await saveBoards(generatedBoards, count);
      saveBoardCount(count);
      setCurrentStep('preview');
      navigate('/preview');
    } catch (error) {
      console.error('Error generating boards:', error);
      const errorMessage = error instanceof Error ? error.message : t('common.error');
      alert(`${t('boardGenerator.errors.generateError')}: ${errorMessage}. ${t('boardGenerator.errors.tryAgain')}`);
    }
  };

  const handlePreviewModify = () => {
    setCurrentStep('cards');
    navigate('/cards');
  };

  const handlePreviewRegenerate = () => {
    setCurrentStep('board-count');
    navigate('/board-count');
  };

  /** Tableros con cartas que usan imágenes desde IndexedDB (hidratadas) para vista previa al instante (usuario logueado). */
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

  const handlePreviewConfirm = async () => {
    setIsGeneratingPDF(true);
    try {
      const pdfBlob = await generatePDF(boardsWithHydratedImages, user && currentSetId ? { allCards: cards } : undefined);
      downloadPDF(pdfBlob);
      setShowConfirmation(true);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert(t('boardGenerator.errors.pdfError'));
    } finally {
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
      <Navbar />
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
          path="/beneficios"
          element={<BenefitsPage />}
        />
        <Route
          path="/como-se-juega"
          element={<HowToPlay />}
        />
        <Route
          path="/que-es-la-loteria"
          element={<AboutLoteria />}
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
          path="/comprar-tokens"
          element={<BuyTokensPage />}
        />
        <Route
          path="/cards"
          element={
            <CardEditor
              onNext={handleCardsNext}
              onCancel={handleCancelProcess}
              gridSize={gridSize}
              onGridSizeChange={setGridSize}
            />
          }
        />
        <Route
          path="/board-count"
          element={
            <BoardCountSelector
              onGenerate={handleBoardCountGenerate}
              onCancel={handleCancelProcess}
              gridSize={gridSize}
            />
          }
        />
        <Route
          path="/preview"
          element={
            boards.length > 0 ? (
              <BoardPreview
                boards={boardsWithHydratedImages}
                onModify={handlePreviewModify}
                onConfirm={handlePreviewConfirm}
                onRegenerate={handlePreviewRegenerate}
              />
            ) : (
              <div style={{ padding: '48px', textAlign: 'center' }}>
                <h2>Redirigiendo...</h2>
                <button onClick={() => navigate('/cards')} className="btn btn--primary">
                  {t('common.back')}
                </button>
              </div>
            )
          }
        />
      </Routes>

      <Footer />

      {isGenerating && (
        <div className="app__loading">
          <div className="app__loading-spinner"></div>
          <p>{t('boardGenerator.status.generatingBoards')}</p>
        </div>
      )}

      {isGeneratingPDF && (
        <div className="app__loading">
          <div className="app__loading-spinner"></div>
          <p>{t('boardGenerator.status.generatingPDF')}</p>
        </div>
      )}

      {showConfirmation && (
        <ConfirmationModal
          onComplete={handleConfirmationComplete}
          onModify={handleConfirmationModify}
          isLoggedIn={!!user}
        />
      )}

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
