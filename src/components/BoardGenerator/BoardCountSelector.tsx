import { useState, useEffect } from 'react';
import { FaLightbulb, FaExclamationTriangle, FaArrowRight } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import './BoardCountSelector.css';
import { loadCards } from '../../utils/storage';
import { GridSize } from '../../types';

interface BoardCountSelectorProps {
  onGenerate: (count: number, gridSize: GridSize) => void;
  onCancel: () => void;
  gridSize: GridSize;
}

// Calculate binomial coefficient C(n, k) = n! / (k! * (n-k)!)
const binomialCoefficient = (n: number, k: number): number => {
  if (k > n || k < 0) return 0;
  if (k === 0 || k === n) return 1;

  // Use iterative approach to avoid overflow
  let result = 1;
  const minK = Math.min(k, n - k);

  for (let i = 0; i < minK; i++) {
    result = result * (n - i) / (i + 1);
  }

  return Math.round(result);
};

// Calculate maximum unique boards possible (no duplicates)
const calculateMaxUniqueBoards = (availableCards: number, gridSize: GridSize): number => {
  if (availableCards < gridSize) return 0;

  // Maximum unique boards = C(availableCards, gridSize)
  // But we use 50% of theoretical max as safe limit for generation efficiency
  const theoreticalMax = binomialCoefficient(availableCards, gridSize);
  const safeMax = Math.floor(theoreticalMax * 0.5); // 50% safety margin

  return safeMax;
};

// Calculate suggested board count based on available cards
const calculateSuggestedBoards = (availableCards: number, gridSize: GridSize): number => {
  if (availableCards < gridSize) {
    return 8; // Default if not enough cards (won't be used anyway)
  }

  // Formula:
  // - Kids (3x3): 1 board per 3 cards (User request)
  // - Classic (4x4): 8 appearances per card (balanced distribution)

  let idealBoards: number;

  if (gridSize === 9) {
    idealBoards = Math.floor(availableCards / 3);
  } else {
    idealBoards = Math.round((availableCards * 8) / gridSize);
  }

  // Maximum unique boards considering duplicates are not allowed
  const maxUniqueBoards = calculateMaxUniqueBoards(availableCards, gridSize);

  // Take the minimum to ensure we can generate unique boards
  // For very few cards, maxUniqueBoards might be small
  const suggested = Math.min(idealBoards, maxUniqueBoards);

  // Never less than 1, but also never more than max unique
  return Math.max(1, Math.min(suggested, maxUniqueBoards));
};

export const BoardCountSelector = ({ onGenerate, onCancel, gridSize }: BoardCountSelectorProps) => {
  const { t } = useTranslation();
  const [boardCount, setBoardCount] = useState<number>(8);
  const [inputValue, setInputValue] = useState<string>('8');
  const [error, setError] = useState<string>('');
  const [cardCount, setCardCount] = useState<number>(0);
  const [isLoadingCards, setIsLoadingCards] = useState(true);
  const [suggestedBoards, setSuggestedBoards] = useState<number>(8);

  useEffect(() => {
    // Load card count on mount
    const loadCardCount = async () => {
      try {
        const cards = await loadCards();
        const loadedCardCount = cards.length;
        setCardCount(loadedCardCount);

        // Calculate suggested boards based on loaded cards and current grid size
        const suggested = calculateSuggestedBoards(loadedCardCount, gridSize);
        setSuggestedBoards(suggested);

        // Set initial value.
        // Kids (3x3): Keep default 5 (User request "logica 3x3 igual")
        // Classic (4x4): Use calculated suggestion (User request "input deberia mostrar sugeridos")
        let defaultCount = gridSize === 9 ? 5 : suggested;

        // For Kids mode or edge cases, ensure we don't exceed the suggested/max limit if it's lower
        if (gridSize === 9 && defaultCount > suggested) {
          defaultCount = suggested;
        }

        setBoardCount(defaultCount);
        setInputValue(defaultCount.toString());
      } catch (error) {
        console.error('Error loading cards:', error);
      } finally {
        setIsLoadingCards(false);
      }
    };
    loadCardCount();
  }, [gridSize]); // Re-run when gridSize changes to update suggestions and defaults

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
      setError(t('boardGenerator.form.errorNumbers'));
      return;
    }

    const numValue = parseInt(value, 10);

    if (isNaN(numValue) || numValue < 1) {
      setError(t('boardGenerator.form.errorMin'));
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
      setError(t('boardGenerator.form.errorAtLeastOne'));
      return;
    }

    // Check if requested count exceeds maximum unique boards possible
    if (cardCount >= gridSize) {
      const maxUniqueBoards = calculateMaxUniqueBoards(cardCount, gridSize);
      if (boardCount > maxUniqueBoards) {
        setError(t('boardGenerator.form.errorMaxUnique', { count: cardCount, max: maxUniqueBoards }));
        return;
      }
    }

    onGenerate(boardCount, gridSize);
  };

  return (
    <div className="board-count-selector">
      <div className="board-count-selector__header">
        <h1 className="board-count-selector__title">{t('boardGenerator.title')}</h1>
        <p className="board-count-selector__subtitle">
          {t('boardGenerator.modeSelection', {
            mode: gridSize === 16 ? t('boardGenerator.modes.classic') : t('boardGenerator.modes.kids')
          })}
        </p>
      </div>

      {!isLoadingCards && cardCount >= gridSize && (
        <div className="board-count-selector__suggestion">
          <div className="board-count-selector__suggestion-icon">
            <FaLightbulb />
          </div>
          <div className="board-count-selector__suggestion-content">
            <div className="board-count-selector__suggestion-title">{t('boardGenerator.suggestion.title')}</div>
            <div className="board-count-selector__suggestion-text">
              {t('boardGenerator.suggestion.text', { count: cardCount, suggested: suggestedBoards })}
              {(() => {
                const maxUnique = calculateMaxUniqueBoards(cardCount, gridSize);
                if (maxUnique < 100 && maxUnique !== suggestedBoards) {
                  return t('boardGenerator.suggestion.maxTheoretical', { max: maxUnique });
                }
                return '';
              })()}
            </div>
          </div>
        </div>
      )}

      {!isLoadingCards && cardCount < gridSize && (
        <div className="board-count-selector__error-message">
          <div className="board-count-selector__error-icon">
            <FaExclamationTriangle />
          </div>
          <div className="board-count-selector__error-content">
            <div className="board-count-selector__error-title">{t('boardGenerator.insufficientCards.title')}</div>
            <div className="board-count-selector__error-text">
              {t('boardGenerator.insufficientCards.text', {
                needed: gridSize,
                mode: gridSize === 16 ? t('boardGenerator.modes.classic') : t('boardGenerator.modes.kids'),
                count: cardCount
              })}
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="board-count-selector__form">
        <div className="board-count-selector__input-group">
          <label htmlFor="board-count" className="board-count-selector__label">
            {t('boardGenerator.form.label')}
          </label>
          {!isLoadingCards && cardCount >= gridSize && (
            <div className="board-count-selector__hint">
              {t('boardGenerator.form.hint', { count: suggestedBoards })}
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
            placeholder={!isLoadingCards && cardCount >= gridSize ? suggestedBoards.toString() : t('boardGenerator.form.placeholder')}
          />
          {error && <div className="board-count-selector__error">{error}</div>}
        </div>

        <div className="board-count-selector__actions">
          <button
            type="button"
            onClick={onCancel}
            className="board-count-selector__cancel-button"
          >
            {t('boardGenerator.actions.cancel')}
          </button>
          <button
            type="submit"
            disabled={boardCount < 1 || cardCount < gridSize}
            className={`board-count-selector__button ${boardCount >= 1 && cardCount >= gridSize ? 'board-count-selector__button--enabled' : ''}`}
          >
            <span>{t('boardGenerator.actions.generate')}</span>
            <FaArrowRight />
          </button>
        </div>
      </form>
    </div>
  );
};
