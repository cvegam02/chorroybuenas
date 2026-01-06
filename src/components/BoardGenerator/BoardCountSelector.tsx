import { useState, useEffect } from 'react';
import './BoardCountSelector.css';
import { loadCards } from '../../utils/storage';

const MIN_BOARDS = 8;

interface BoardCountSelectorProps {
  onGenerate: (count: number) => void;
}

export const BoardCountSelector = ({ onGenerate }: BoardCountSelectorProps) => {
  const [boardCount, setBoardCount] = useState<number>(MIN_BOARDS);
  const [inputValue, setInputValue] = useState<string>(MIN_BOARDS.toString());
  const [error, setError] = useState<string>('');
  const [cardCount, setCardCount] = useState<number>(0);
  const [isLoadingCards, setIsLoadingCards] = useState(true);

  useEffect(() => {
    // Load card count on mount
    const loadCardCount = async () => {
      try {
        const cards = await loadCards();
        setCardCount(cards.length);
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
      setBoardCount(MIN_BOARDS); // Use minimum for calculations
      return;
    }

    // Only allow numeric characters
    if (!/^\d+$/.test(value)) {
      setError('Por favor ingresa solo números');
      return;
    }

    const numValue = parseInt(value, 10);
    
    if (isNaN(numValue)) {
      setError('Por favor ingresa un número válido');
      return;
    }

    if (numValue < MIN_BOARDS) {
      setError(`El mínimo es ${MIN_BOARDS} tableros`);
      setBoardCount(numValue);
    } else {
      setError('');
      setBoardCount(numValue);
    }
  };
  
  const handleInputBlur = () => {
    // If input is empty or invalid on blur, set to minimum
    if (inputValue === '' || boardCount < MIN_BOARDS || isNaN(boardCount)) {
      setBoardCount(MIN_BOARDS);
      setInputValue(MIN_BOARDS.toString());
      setError('');
    } else {
      // Sync input value with boardCount
      setInputValue(boardCount.toString());
    }
  };

  // Calculate recommended board count based on available cards
  const calculateRecommendations = (availableCards: number) => {
    if (availableCards < 16) {
      // Not enough cards for even one board
      return { minBoards: 0, idealBoards: 0, maxBoards: 0 };
    }
    
    // Each board needs 16 cards
    // Ideal range: 6-10 appearances per card
    // appearancesPerCard = (boards * 16) / availableCards
    // We want: 6 <= appearancesPerCard <= 10
    // => boardsMin = ceil(6 * availableCards / 16)
    // => boardsMax = floor(10 * availableCards / 16)

    const minBoards = Math.ceil((availableCards * 6) / 16);   // menos repetición (cada carta ~6 veces)
    const idealBoards = Math.round((availableCards * 8) / 16); // balanceado (cada carta ~8 veces)
    const maxBoards = Math.floor((availableCards * 10) / 16);  // más repetición (cada carta ~10 veces)

    // Ensure ordering just in case rounding causes weirdness
    const orderedMin = Math.min(minBoards, idealBoards, maxBoards);
    const orderedMax = Math.max(minBoards, idealBoards, maxBoards);
    const orderedIdeal = Math.min(Math.max(idealBoards, orderedMin), orderedMax);

    return { minBoards: orderedMin, idealBoards: orderedIdeal, maxBoards: orderedMax };
  };

  const recommendations = calculateRecommendations(cardCount);
  const appearancesPerCard =
    cardCount > 0 ? (boardCount * 16) / cardCount : 0;

  const getFriendlyStatus = () => {
    if (boardCount < MIN_BOARDS) {
      return {
        tone: 'error' as const,
        text: `El mínimo requerido por la app es ${MIN_BOARDS} tableros.`,
      };
    }

    if (cardCount < 16) {
      return {
        tone: 'error' as const,
        text: 'Necesitas al menos 16 cartas para poder generar un tablero.',
      };
    }

    // Dentro del rango recomendado (6–10 apariciones aprox.)
    if (appearancesPerCard >= 6 && appearancesPerCard <= 10) {
      return {
        tone: 'good' as const,
        text: `Tu selección está dentro del rango recomendado para tus ${cardCount} cartas.`,
      };
    }

    // Muy pocas apariciones por carta -> demasiadas cartas para pocos tableros (poca repetición)
    if (appearancesPerCard < 6) {
      return {
        tone: 'warning' as const,
        text: 'Vas a tener muy poca repetición entre tableros. Si quieres que salgan más “parejos”, sube un poco el número de tableros.',
      };
    }

    // Muchas apariciones por carta -> demasiados tableros para pocas cartas (mucha repetición)
    return {
      tone: 'warning' as const,
      text: 'Puede haber mucha repetición entre tableros. Si quieres más variedad, baja el número de tableros o agrega más cartas.',
    };
  };

  const friendlyStatus = getFriendlyStatus();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (boardCount < MIN_BOARDS) {
      setError(`El mínimo es ${MIN_BOARDS} tableros`);
      return;
    }

    onGenerate(boardCount);
  };

  return (
    <div className="board-count-selector">
      <h2 className="board-count-selector__title">Cantidad de Tableros</h2>
      
      <div className="board-count-selector__info">
        Cada tablero tendrá 16 cartas únicas. Las cartas pueden repetirse entre diferentes tableros.
      </div>

      {/* Recommendations Section */}
      {!isLoadingCards && (
        <div className="board-count-selector__recommendations">
          <h3 className="board-count-selector__recommendations-title">💡 ¿Cuántos tableros puedes generar?</h3>
          <p className="board-count-selector__recommendations-intro">
            Con las cartas que tienes, puedes generar diferentes cantidades de tableros. 
            Para una buena distribución y evitar demasiadas repeticiones, cada carta debería aparecer entre 6 y 10 veces en total.
          </p>
          
          {cardCount < 16 ? (
            <div className="board-count-selector__recommendations-status board-count-selector__recommendations-status--error">
              <p>
                ❌ Necesitas al menos <strong>16 cartas</strong> para generar un tablero. 
                Actualmente tienes <strong>{cardCount} carta{cardCount !== 1 ? 's' : ''}</strong>.
              </p>
            </div>
          ) : (
            <>
              <div className="board-count-selector__recommendations-results">
                <div className="board-count-selector__recommendation-item board-count-selector__recommendation-item--min">
                  <span className="board-count-selector__recommendation-label">Mínimo:</span>
                  <span className="board-count-selector__recommendation-value">{recommendations.minBoards} tablero{recommendations.minBoards !== 1 ? 's' : ''}</span>
                  <span className="board-count-selector__recommendation-note">(más variedad entre tableros)</span>
                </div>
                <div className="board-count-selector__recommendation-item board-count-selector__recommendation-item--ideal">
                  <span className="board-count-selector__recommendation-label">Ideal:</span>
                  <span className="board-count-selector__recommendation-value">{recommendations.idealBoards} tablero{recommendations.idealBoards !== 1 ? 's' : ''}</span>
                  <span className="board-count-selector__recommendation-note">(balanceado)</span>
                </div>
                <div className="board-count-selector__recommendation-item board-count-selector__recommendation-item--max">
                  <span className="board-count-selector__recommendation-label">Máximo:</span>
                  <span className="board-count-selector__recommendation-value">{recommendations.maxBoards} tablero{recommendations.maxBoards !== 1 ? 's' : ''}</span>
                  <span className="board-count-selector__recommendation-note">(más repetición)</span>
                </div>
              </div>

              <div className="board-count-selector__recommendations-status">
                {friendlyStatus.tone === 'good' ? (
                  <p className="board-count-selector__recommendations-status--good">
                    ✅ {friendlyStatus.text}
                  </p>
                ) : friendlyStatus.tone === 'warning' ? (
                  <p className="board-count-selector__recommendations-status--warning">
                    ⚠️ {friendlyStatus.text}
                  </p>
                ) : (
                  <p className="board-count-selector__recommendations-status--error">
                    ❌ {friendlyStatus.text}
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="board-count-selector__form">
        <div className="board-count-selector__input-group">
          <label htmlFor="board-count" className="board-count-selector__label">
            ¿Cuántos tableros quieres generar?
          </label>
          <p className="board-count-selector__input-hint">
            {!isLoadingCards && cardCount >= 16 ? (
              <>Mínimo: <strong>{MIN_BOARDS} tableros</strong> | Recomendado: <strong>{recommendations.idealBoards} tableros</strong> | Máximo: <strong>{recommendations.maxBoards} tableros</strong></>
            ) : (
              <>Mínimo requerido: <strong>{MIN_BOARDS} tableros</strong></>
            )}
          </p>
          <input
            id="board-count"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={inputValue}
            onChange={handleCountChange}
            onBlur={handleInputBlur}
            className="board-count-selector__input"
            placeholder={`Ej: ${MIN_BOARDS}`}
          />
          {error && <div className="board-count-selector__error">{error}</div>}
        </div>

        <button
          type="submit"
          disabled={boardCount < MIN_BOARDS}
          className="board-count-selector__button"
        >
          Generar Tableros
        </button>
      </form>
    </div>
  );
};

