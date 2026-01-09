import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { LandingPage } from './components/LandingPage/LandingPage';
import { CardEditor } from './components/CardEditor/CardEditor';
import { BoardCountSelector } from './components/BoardGenerator/BoardCountSelector';
import { BoardPreview } from './components/BoardGenerator/BoardPreview';
import { ConfirmationModal } from './components/ConfirmationModal/ConfirmationModal';
import { HowToPlay } from './components/HowToPlay/HowToPlay';
import { AboutLoteria } from './components/AboutLoteria/AboutLoteria';
import { Navbar } from './components/Navbar/Navbar';
import { useBoard } from './hooks/useBoard';
import { generatePDF, downloadPDF } from './services/PDFService';
import { saveBoards, saveBoardCount, clearAllData } from './utils/storage';
import { Board } from './types';

type AppStep = 'cards' | 'board-count' | 'preview' | 'confirmation';

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentStep, setCurrentStep] = useState<AppStep | null>(null);
  const [boards, setBoards] = useState<Board[]>([]);
  const [, setBoardCount] = useState<number>(8);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const { generateBoards, isGenerating } = useBoard();

  // Initialize step based on current route
  useEffect(() => {
    if (location.pathname === '/cards' && currentStep !== 'cards') {
      setCurrentStep('cards');
    }
  }, [location.pathname, currentStep]);

  const handleCardsNext = () => {
    setCurrentStep('board-count');
    navigate('/board-count');
  };

  const handleBoardCountGenerate = async (count: number) => {
    setBoardCount(count);
    try {
      const generatedBoards = await generateBoards(count);
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
              <CardEditor onNext={handleCardsNext} />
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
              <BoardCountSelector onGenerate={handleBoardCountGenerate} />
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
    </>
  );
}

export default AppContent;
