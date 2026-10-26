import { useState, useEffect, useMemo } from 'react';
import {
  FaArrowLeft,
  FaArrowRight,
  FaExclamationTriangle,
  FaMinus,
  FaPlus,
  FaRegLightbulb,
} from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import './BoardCountSelector.css';
import { BoardPile } from './BoardPile';
import { loadCards } from '../../utils/storage';
import { Card, GridSize } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useSetContext } from '../../contexts/SetContext';
import { CardRepository } from '../../repositories/CardRepository';
import { logger } from '../../utils/logger';
import { minCardsForGrid } from '../../utils/gridRules';
import { withCardNumbers } from '../../utils/cardNumbers';
import { maxUniqueBoards, suggestedBoardCount } from '../../utils/boardGeneration';
import {
  MIN_BOARD_COUNT,
  boardCountShortcuts,
  pickSample,
  sheetPileSize,
  stepBoardCount,
} from '../../utils/boardCountPicker';

interface BoardCountSelectorProps {
  onGenerate: (count: number, gridSize: GridSize) => void;
  onBack: () => void;
  gridSize: GridSize;
  /** `dialog`: dentro de la ventana de U2 (FEAT-57), sin fondo ni márgenes de página y con «Cancelar». */
  variant?: 'page' | 'dialog';
  /** `id` del título, para nombrar la ventana. */
  titleId?: string;
  /** Cantidad con la que empieza, en lugar de la sugerida (al revolver, los tableros que ya hay). */
  initialCount?: number;
  /** Aviso arriba del número (al revolver: los tableros de ahora se reemplazan). */
  notice?: string;
  /** Se están armando: el botón se apaga. */
  isGenerating?: boolean;
}

export const BoardCountSelector = ({
  onGenerate,
  onBack,
  gridSize,
  variant = 'page',
  titleId,
  initialCount,
  notice,
  isGenerating = false,
}: BoardCountSelectorProps) => {
  const isDialog = variant === 'dialog';
  const { t } = useTranslation();
  const { user } = useAuth();
  const userId = user?.id;
  const { currentSetId } = useSetContext();
  const [boardCount, setBoardCount] = useState<number>(8);
  const [inputValue, setInputValue] = useState<string>('8');
  const [error, setError] = useState<string>('');
  const [cardCount, setCardCount] = useState<number>(0);
  /** La baraja leída para contar las cartas; con ella se dibuja también la muestra. */
  const [deckCards, setDeckCards] = useState<Card[]>([]);
  const [isLoadingCards, setIsLoadingCards] = useState(true);
  const [suggestedBoards, setSuggestedBoards] = useState<number>(8);
  const minCards = minCardsForGrid(gridSize);

  useEffect(() => {
    // Load card count using the SAME source as useBoard.generateBoards
    const loadCardCount = async () => {
      setIsLoadingCards(true);
      try {
        let loadedCards: Card[];
        if (userId && currentSetId) {
          loadedCards = await CardRepository.getCards(userId, currentSetId);
        } else if (userId) {
          loadedCards = []; // Same as useBoard: logged in but no set selected = no cards
        } else {
          loadedCards = await loadCards();
        }
        const loadedCardCount = loadedCards.length;
        setCardCount(loadedCardCount);
        setDeckCards(withCardNumbers(loadedCards));

        // Calculate suggested boards based on loaded cards and current grid size
        const suggested = suggestedBoardCount(loadedCardCount, gridSize);
        setSuggestedBoards(suggested);

        // Set initial value.
        // Kids (3x3): Keep default 5 (User request "logica 3x3 igual")
        // Classic (4x4): Use calculated suggestion (User request "input deberia mostrar sugeridos")
        let defaultCount = gridSize === 9 ? 5 : suggested;

        // For Kids mode or edge cases, ensure we don't exceed the suggested/max limit if it's lower
        if (gridSize === 9 && defaultCount > suggested) {
          defaultCount = suggested;
        }
        if (initialCount !== undefined && initialCount > 0) {
          defaultCount = Math.min(initialCount, maxUniqueBoards(loadedCardCount, gridSize));
        }

        setBoardCount(defaultCount);
        setInputValue(defaultCount.toString());
      } catch (error) {
        logger.error('Error loading cards:', error);
      } finally {
        setIsLoadingCards(false);
      }
    };
    loadCardCount();
  }, [gridSize, userId, currentSetId, initialCount]); // Re-run when gridSize or card source changes

  // La muestra se elige una vez por baraja: no cambia al mover el número de tableros.
  const deckSize = deckCards.length;
  const sampleIndexes = useMemo(
    () => pickSample(Array.from({ length: deckSize }, (_, i) => i), gridSize),
    [deckSize, gridSize]
  );
  const sample = sampleIndexes.flatMap((index) => (deckCards[index] ? [deckCards[index]] : []));

  const hasEnoughCards = !isLoadingCards && cardCount >= minCards;
  const maxBoards = maxUniqueBoards(cardCount, gridSize);
  const shortcuts = hasEnoughCards ? boardCountShortcuts(suggestedBoards, maxBoards) : [];
  const modeLabel = gridSize === 16 ? t('cardEditor.deck.modeClassic') : t('cardEditor.deck.modeKids');

  const chooseCount = (count: number) => {
    setBoardCount(count);
    setInputValue(count.toString());
    setError('');
  };

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

    if (cardCount < minCards) {
      setError(t('boardGenerator.insufficientCards.title'));
      return;
    }

    // Check if requested count exceeds maximum unique boards possible
    if (cardCount >= gridSize && boardCount > maxBoards) {
      setError(t('boardGenerator.form.errorMaxUnique', { count: cardCount, max: maxBoards }));
      return;
    }

    setError('');
    onGenerate(boardCount, gridSize);
  };

  return (
    <div className={`board-count${isDialog ? ' board-count--dialog' : ''}`}>
      <div className="board-count__inner">
        <form onSubmit={handleSubmit} className="board-count__panel">
          <div>
            {isDialog ? (
              <h2 id={titleId} className="board-count__title">{t('boardGenerator.count.title')}</h2>
            ) : (
              <h1 id={titleId} className="board-count__title">{t('boardGenerator.count.title')}</h1>
            )}
            <p className="board-count__subtitle">
              {modeLabel}
              {!isLoadingCards && ` · ${t('boardGenerator.count.deckCards', { count: cardCount })}`}
            </p>
          </div>

          {notice && (
            <div className="board-count__warning">
              <span className="board-count__note-icon">
                <FaExclamationTriangle aria-hidden="true" />
              </span>
              <p className="board-count__note-text">{notice}</p>
            </div>
          )}

          {!isLoadingCards && cardCount < minCards && (
            <div className="board-count__warning" role="alert">
              <span className="board-count__note-icon">
                <FaExclamationTriangle aria-hidden="true" />
              </span>
              <p className="board-count__note-text">
                <strong>{t('boardGenerator.insufficientCards.title')}</strong>{' '}
                {t('boardGenerator.insufficientCards.text', {
                  needed: minCards,
                  mode: gridSize === 16 ? t('boardGenerator.modes.classic') : t('boardGenerator.modes.kids'),
                  count: cardCount,
                })}
              </p>
            </div>
          )}

          <div className="board-count__stepper">
            <button
              type="button"
              className="board-count__step"
              aria-label={t('boardGenerator.count.decrease')}
              disabled={!hasEnoughCards || boardCount <= MIN_BOARD_COUNT}
              onClick={() => chooseCount(stepBoardCount(boardCount, -1, maxBoards))}
            >
              <FaMinus aria-hidden="true" />
            </button>
            <label htmlFor="board-count" className="board-count__value">
              <input
                id="board-count"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={inputValue}
                onChange={handleCountChange}
                onBlur={handleInputBlur}
                className="board-count__input"
                style={{ width: `${Math.max(inputValue.length, 1)}ch` }}
                aria-label={t('boardGenerator.form.label')}
                aria-invalid={error !== ''}
                aria-describedby={error ? 'board-count-error' : undefined}
              />
              <span className="board-count__unit">{t('boardGenerator.count.unit', { count: boardCount })}</span>
            </label>
            <button
              type="button"
              className="board-count__step"
              aria-label={t('boardGenerator.count.increase')}
              disabled={!hasEnoughCards || boardCount >= maxBoards}
              onClick={() => chooseCount(stepBoardCount(boardCount, 1, maxBoards))}
            >
              <FaPlus aria-hidden="true" />
            </button>
          </div>

          {error && (
            <div id="board-count-error" className="board-count__error" role="alert">
              {error}
            </div>
          )}

          {shortcuts.length > 0 && (
            <div className="board-count__shortcuts" role="group" aria-label={t('boardGenerator.count.shortcutsLabel')}>
              {shortcuts.map(({ count, isSuggested }) => (
                <button
                  key={count}
                  type="button"
                  className={`board-count__shortcut${isSuggested ? ' board-count__shortcut--suggested' : ''}`}
                  aria-pressed={boardCount === count}
                  onClick={() => chooseCount(count)}
                >
                  {isSuggested ? t('boardGenerator.count.suggested', { count }) : count}
                </button>
              ))}
            </div>
          )}

          {hasEnoughCards && (
            <div className="board-count__suggestion">
              <span className="board-count__note-icon">
                <FaRegLightbulb aria-hidden="true" />
              </span>
              <p className="board-count__note-text">
                <strong>{t('boardGenerator.count.suggestionLead', { suggested: suggestedBoards })}</strong>{' '}
                {t('boardGenerator.count.suggestionText', { count: cardCount })}
              </p>
            </div>
          )}

          <div className="board-count__actions">
            <button type="button" onClick={onBack} className="board-count__back" disabled={isGenerating}>
              {!isDialog && <FaArrowLeft aria-hidden="true" />}
              {isDialog ? t('common.cancel') : t('boardGenerator.count.back')}
            </button>
            <button
              type="submit"
              disabled={boardCount < 1 || cardCount < minCards || isGenerating}
              className="board-count__generate"
            >
              {isGenerating ? t('boardGenerator.count.generating') : t('boardGenerator.count.generate', { count: boardCount })}
              {!isGenerating && <FaArrowRight aria-hidden="true" />}
            </button>
          </div>
        </form>

        {sample.length === gridSize && (
          <BoardPile sample={sample} gridSize={gridSize} sheets={sheetPileSize(boardCount)} />
        )}
      </div>
    </div>
  );
};
