import { useState } from 'react';
import { LandingPage } from './components/LandingPage/LandingPage';
import { CardEditor } from './components/CardEditor/CardEditor';
import { BoardCountSelector } from './components/BoardGenerator/BoardCountSelector';
import { BoardPreview } from './components/BoardGenerator/BoardPreview';
import { ConfirmationModal } from './components/ConfirmationModal/ConfirmationModal';
import { useBoard } from './hooks/useBoard';
import { generatePDF, downloadPDF } from './services/PDFService';
import { saveBoards, saveBoardCount, clearAllData } from './utils/storage';
import { Board } from './types';
import './App.css';

type AppStep = 'landing' | 'cards' | 'board-count' | 'preview' | 'confirmation';

function App() {
  const [currentStep, setCurrentStep] = useState<AppStep>('landing');
  const [boards, setBoards] = useState<Board[]>([]);
  const [boardCount, setBoardCount] = useState<number>(8);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const { generateBoards, isGenerating } = useBoard();

  const handleCardsNext = () => {
    setCurrentStep('board-count');
  };

  const handleBoardCountGenerate = async (count: number) => {
    setBoardCount(count);
    try {
      const generatedBoards = await generateBoards(count);
      setBoards(generatedBoards);
      saveBoards(generatedBoards, count);
      saveBoardCount(count);
      setCurrentStep('preview');
    } catch (error) {
      console.error('Error generating boards:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      alert(`Error al generar los tableros: ${errorMessage}. Por favor, intenta nuevamente.`);
    }
  };

  const handlePreviewModify = () => {
    setCurrentStep('cards');
  };

  const handlePreviewRegenerate = () => {
    setCurrentStep('board-count');
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

  const handleConfirmationComplete = () => {
    clearAllData();
    setCurrentStep('landing');
    setBoards([]);
    setBoardCount(8);
    setShowConfirmation(false);
    // Force reload to clear any component state
    window.location.reload();
  };

  const handleLandingStart = () => {
    setCurrentStep('cards');
  };

  const handleConfirmationModify = () => {
    setShowConfirmation(false);
    setCurrentStep('cards');
  };

  return (
    <div className="app">
      {currentStep === 'landing' && <LandingPage onStart={handleLandingStart} />}
      
      {currentStep === 'cards' && <CardEditor onNext={handleCardsNext} />}
      
      {currentStep === 'board-count' && (
        <BoardCountSelector onGenerate={handleBoardCountGenerate} />
      )}
      
      {currentStep === 'preview' && (
        <BoardPreview
          boards={boards}
          onModify={handlePreviewModify}
          onConfirm={handlePreviewConfirm}
          onRegenerate={handlePreviewRegenerate}
        />
      )}

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
    </div>
  );
}

export default App;
