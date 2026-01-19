import { useState, useEffect } from 'react';
import { FaLightbulb, FaExclamationTriangle, FaArrowRight } from 'react-icons/fa';
import './BoardCountSelector.css';
import { loadCards } from '../../utils/storage';

interface BoardCountSelectorProps {
  onGenerate: (count: number) => void;
}

export const BoardCountSelector = ({ onGenerate }: BoardCountSelectorProps) => {
  const [boardCount, setBoardCount] = useState<number>(8);
  const [inputValue, setInputValue] = useState<string>('8');
  const [error, setError] = useState<string>('');
  const [cardCount, setCardCount] = useState<number>(0);
  const [isLoadingCards, setIsLoadingCards] = useState(true);
  const [suggestedBoards, setSuggestedBoards] = useState<number>(8);

  // Calculate suggested board count based on available cards
  const calculateSuggestedBoards = (availableCards: number): number => {
    if (availableCards < 16) {
      return 8; // Default if not enough cards
    }
    
    // Ideal: 8 appearances per card (balanced)
    // Formula: (availableCards * 8) / 16
    const idealBoards = Math.round((availableCards * 8) / 16);
    
    // Never less than 1
    return Math.max(idealBoards, 1);
  };

  useEffect(() => {
    // Load card count on mount
    const loadCardCount = async () => {
      try {
        const cards = await loadCards();
        const loadedCardCount = cards.length;
        setCardCount(loadedCardCount);
        
        // Calculate suggested boards based on loaded cards
        const suggested = calculateSuggestedBoards(loadedCardCount);
        setSuggestedBoards(suggested);
        
        // Set initial value to suggested boards
        setBoardCount(suggested);
        setInputValue(suggested.toString());
      } catch (error) {
        console.error('Error loading cards:', error);
      } finally {
        setIsLoadingCards(false);
      }
    };
    loadCardCount();
  }, []);

  const handleCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.trim();
    setInputValue(value);
    
    // Allow empty input temporarily (for typing)
    if (value === '') {
      setError('');
      setBoardCount(suggestedBoards); // Use suggested for calculations
      return;
    }

    // Only allow numeric characters
    if (!/^\d+$/.test(value)) {
      setError('Por favor ingresa solo números');
      return;
    }

    const numValue = parseInt(value, 10);
    
    if (isNaN(numValue) || numValue < 1) {
      setError('Por favor ingresa un número válido (mínimo 1)');
      setBoardCount(numValue);
      return;
    }

    setError('');
    setBoardCount(numValue);
  };
  
  const handleInputBlur = () => {
    // If input is empty or invalid on blur, set to suggested
    if (inputValue === '' || boardCount < 1 || isNaN(boardCount)) {
      setBoardCount(suggestedBoards);
      setInputValue(suggestedBoards.toString());
      setError('');
    } else {
      // Sync input value with boardCount
      setInputValue(boardCount.toString());
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (boardCount < 1) {
      setError('Debes generar al menos 1 tablero');
      return;
    }

    onGenerate(boardCount);
  };

  return (
    <div className="board-count-selector">
      <div className="board-count-selector__header">
        <h1 className="board-count-selector__title">Cantidad de Tableros</h1>
        <p className="board-count-selector__subtitle">
          Cada tablero tendrá 16 cartas únicas. Las cartas pueden repetirse entre diferentes tableros.
        </p>
      </div>

      {!isLoadingCards && cardCount >= 16 && (
        <div className="board-count-selector__suggestion">
          <div className="board-count-selector__suggestion-icon">
            <FaLightbulb />
          </div>
          <div className="board-count-selector__suggestion-content">
            <div className="board-count-selector__suggestion-title">Sugerencia</div>
            <div className="board-count-selector__suggestion-text">
              Con tus <strong>{cardCount} cartas</strong>, te sugerimos generar <strong>{suggestedBoards} tablero{suggestedBoards !== 1 ? 's' : ''}</strong> para una distribución balanceada.
            </div>
          </div>
        </div>
      )}

      {!isLoadingCards && cardCount < 16 && (
        <div className="board-count-selector__error-message">
          <div className="board-count-selector__error-icon">
            <FaExclamationTriangle />
          </div>
          <div className="board-count-selector__error-content">
            <div className="board-count-selector__error-title">Cartas insuficientes</div>
            <div className="board-count-selector__error-text">
              Necesitas al menos <strong>16 cartas</strong> para generar un tablero. 
              Actualmente tienes <strong>{cardCount} carta{cardCount !== 1 ? 's' : ''}</strong>.
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="board-count-selector__form">
        <div className="board-count-selector__input-group">
          <label htmlFor="board-count" className="board-count-selector__label">
            ¿Cuántos tableros quieres generar?
          </label>
          {!isLoadingCards && cardCount >= 16 && (
            <div className="board-count-selector__hint">
              Sugerido: <strong>{suggestedBoards} tableros</strong>
            </div>
          )}
          <input
            id="board-count"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={inputValue}
            onChange={handleCountChange}
            onBlur={handleInputBlur}
            className="board-count-selector__input"
            placeholder={!isLoadingCards && cardCount >= 16 ? suggestedBoards.toString() : '8'}
          />
          {error && <div className="board-count-selector__error">{error}</div>}
        </div>

        <button
          type="submit"
          disabled={boardCount < 1 || cardCount < 16}
          className={`board-count-selector__button ${boardCount >= 1 && cardCount >= 16 ? 'board-count-selector__button--enabled' : ''}`}
        >
          <span>Generar Tableros</span>
          <FaArrowRight />
        </button>
      </form>
    </div>
  );
};
