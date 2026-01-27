import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { LandingPage } from './components/LandingPage/LandingPage';
import { CardEditor } from './components/CardEditor/CardEditor';
import { BoardCountSelector } from './components/BoardGenerator/BoardCountSelector';
import { BoardPreview } from './components/BoardGenerator/BoardPreview';
import { ConfirmationModal } from './components/ConfirmationModal/ConfirmationModal';
import { WarningModal } from './components/ConfirmationModal/WarningModal';
import { HowToPlay } from './components/HowToPlay/HowToPlay';
import { AboutLoteria } from './components/AboutLoteria/AboutLoteria';
import { Navbar } from './components/Navbar/Navbar';
import { Footer } from './components/Footer/Footer';
import { useBoard } from './hooks/useBoard';
import { generatePDF, downloadPDF } from './services/PDFService';
import { saveBoards, saveBoardCount, clearAllData } from './utils/storage';
import { Board, GridSize } from './types';

type AppStep = 'cards' | 'board-count' | 'preview' | 'confirmation';

function AppContent() {
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

  const handleCardsNext = () => {
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
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      alert(`Error al generar los tableros: ${errorMessage}. Por favor, intenta nuevamente.`);
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

  const handlePreviewConfirm = async () => {
    setIsGeneratingPDF(true);
    try {
      const pdfBlob = await generatePDF(boards);
      downloadPDF(pdfBlob);
      setShowConfirmation(true);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error al generar el PDF. Por favor, intenta nuevamente.');
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
          element={<LandingPage onStart={handleLandingStart} />}
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
          path="/cards"
          element={
            currentStep === 'cards' || location.pathname === '/cards' ? (
              <CardEditor
                onNext={handleCardsNext}
                onCancel={handleCancelProcess}
                gridSize={gridSize}
                onGridSizeChange={setGridSize}
              />
            ) : (
              <div style={{ padding: '48px', textAlign: 'center' }}>
                <h2>Redirigiendo...</h2>
              </div>
            )
          }
        />
        <Route
          path="/board-count"
          element={
            currentStep === 'board-count' ? (
              <BoardCountSelector
                onGenerate={handleBoardCountGenerate}
                onCancel={handleCancelProcess}
                gridSize={gridSize}
              />
            ) : (
              <div style={{ padding: '48px', textAlign: 'center' }}>
                <h2>Redirigiendo...</h2>
              </div>
            )
          }
        />
        <Route
          path="/preview"
          element={
            currentStep === 'preview' ? (
              <BoardPreview
                boards={boards}
                onModify={handlePreviewModify}
                onConfirm={handlePreviewConfirm}
                onRegenerate={handlePreviewRegenerate}
              />
            ) : (
              <div style={{ padding: '48px', textAlign: 'center' }}>
                <h2>Redirigiendo...</h2>
              </div>
            )
          }
        />
      </Routes>

      <Footer />

      {isGenerating && (
        <div className="app__loading">
          <div className="app__loading-spinner"></div>
          <p>Generando tableros...</p>
        </div>
      )}

      {isGeneratingPDF && (
        <div className="app__loading">
          <div className="app__loading-spinner"></div>
          <p>Generando PDF...</p>
        </div>
      )}

      {showConfirmation && (
        <ConfirmationModal
          onComplete={handleConfirmationComplete}
          onModify={handleConfirmationModify}
        />
      )}

      <WarningModal
        isOpen={showCancelModal}
        title="¿Cancelar proceso?"
        message="Se perderá todo el progreso que hayas hecho hasta ahora, incluyendo las cartas subidas y los tableros generados."
        confirmText="Sí, cancelar todo"
        cancelText="No, continuar"
        onConfirm={confirmCancel}
        onCancel={() => setShowCancelModal(false)}
        type="danger"
      />
    </>
  );
}

export default AppContent;
