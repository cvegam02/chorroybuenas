import { useTranslation } from 'react-i18next';
import { Card, GridSize } from '../../types';
import { useComposedCard } from '../../hooks/useComposedCard';
import { pileSheetCards } from '../../utils/boardCountPicker';

interface BoardPileProps {
  /** Las cartas de la muestra: las que caben en un tablero. */
  sample: readonly Card[];
  gridSize: GridSize;
  sheets: number;
}

/** Una carta de la muestra: como sale impresa cuando ya está compuesta; si no, la foto. */
const PileCard = ({ card }: { card: Card }) => {
  const composedUrl = useComposedCard(card);
  const imageUrl = composedUrl ?? card.image;

  return imageUrl ? (
    <img src={imageUrl} alt="" className="board-pile__card" draggable={false} />
  ) : (
    <span className="board-pile__card board-pile__card--blank" />
  );
};

/**
 * Muestra de C2 (FEAT-34, US A4): un tablerito con las cartas del usuario y hojas detrás que crecen con
 * el número de tableros. Es solo un dibujo: no son los tableros finales y no guarda nada.
 */
export const BoardPile = ({ sample, gridSize, sheets }: BoardPileProps) => {
  const { t } = useTranslation();
  // La hoja del frente (la 0) se pinta al final para quedar encima.
  const sheetIndexes = Array.from({ length: sheets }, (_, i) => sheets - 1 - i);

  return (
    <div className="board-pile" aria-hidden="true">
      {sheetIndexes.map((sheetIndex) => (
        <div key={sheetIndex} className={`board-pile__sheet board-pile__sheet--${sheetIndex}`}>
          <div className="board-pile__title">
            <span className="board-pile__rule" />
            <strong>{t('boardGenerator.sheetTitle', { number: sheetIndex + 1 })}</strong>
            <span className="board-pile__rule" />
          </div>
          <div className={`board-pile__grid${gridSize === 9 ? ' board-pile__grid--kids' : ''}`}>
            {pileSheetCards(sample, sheetIndex).map((card) => (
              <PileCard key={card.id} card={card} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
