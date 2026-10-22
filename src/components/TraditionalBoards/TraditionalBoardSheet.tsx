import { useState, type DragEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { FaDice, FaExclamationTriangle, FaLock, FaPlus, FaRandom, FaTrashAlt } from 'react-icons/fa';
import { TRADITIONAL_DECK } from '../../utils/traditionalDeck';
import { traditionalCardImage, type TraditionalBoard } from '../../utils/traditionalBoards';
import { isCardDrag, readCardDrag, startCardDrag } from './cardDrag';
import '../BoardGenerator/BoardThumbnail.css';

interface TraditionalBoardSheetProps {
  board: TraditionalBoard;
  index: number;
  /** Números de los otros tableros iguales a este; vacío si no hay. */
  sameAs: readonly number[];
  onShuffle: (id: string) => void;
  /** «Llenar al azar»: solo las casillas vacías de este tablero. */
  onFill: (id: string) => void;
  onDelete: (id: string) => void;
  onPlace: (id: string, cell: number, card: number) => void;
  onSwap: (id: string, from: number, to: number) => void;
  /** Tocar una casilla: abre la baraja para elegir la carta. */
  onPick: (id: string, cell: number) => void;
}

/**
 * Un tablero tradicional dibujado como la hoja de C3, con sus acciones debajo (FEAT-53, US A1). Cada casilla se
 * toca para elegir otra carta, o recibe una carta arrastrada de la baraja o de otra casilla del tablero (US A2).
 */
export const TraditionalBoardSheet = ({
  board,
  index,
  sameAs,
  onShuffle,
  onFill,
  onDelete,
  onPlace,
  onSwap,
  onPick,
}: TraditionalBoardSheetProps) => {
  const { t } = useTranslation();
  const [dropCell, setDropCell] = useState<number | null>(null);
  const number = index + 1;
  const cols = board.cards.length === 9 ? 3 : 4;
  const hasEmpty = board.cards.includes(null);

  const handleDragOver = (event: DragEvent, cell: number) => {
    if (!isCardDrag(event)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setDropCell(cell);
  };

  const handleDrop = (event: DragEvent, cell: number) => {
    event.preventDefault();
    setDropCell(null);
    const drag = readCardDrag(event);
    if (drag?.source === 'deck') onPlace(board.id, cell, drag.card);
    // Entre tableros no se intercambia: solo dentro del mismo (decisión 6).
    else if (drag?.source === 'cell' && drag.boardId === board.id) onSwap(board.id, drag.cell, cell);
  };

  return (
    <li className="traditional-boards__item">
      <div className="board-thumbnail__sheet traditional-boards__sheet">
        <div className="board-thumbnail__title">
          <span className="board-thumbnail__rule" />
          <h3 className="board-thumbnail__name">{t('boardGenerator.sheetTitle', { number })}</h3>
          <span className="board-thumbnail__rule" />
        </div>
        <div className="board-thumbnail__grid" style={{ '--cols': cols } as React.CSSProperties}>
          {board.cards.map((card, cell) => {
            const isFixed = card !== null && board.fixed.includes(card);
            const label =
              card === null
                ? t('traditional.cell.emptyLabel', { cell: cell + 1, number })
                : t(isFixed ? 'traditional.cell.fixedLabel' : 'traditional.cell.label', {
                    cell: cell + 1,
                    name: TRADITIONAL_DECK[card - 1],
                    number,
                  });
            return (
              <button
                key={`${cell}-${card ?? 'vacia'}`}
                type="button"
                className={[
                  'board-thumbnail__cell traditional-boards__cell',
                  card === null ? 'traditional-boards__cell--empty' : '',
                  isFixed ? 'traditional-boards__cell--fixed' : '',
                  dropCell === cell ? 'traditional-boards__cell--drop' : '',
                ].join(' ')}
                aria-label={label}
                onClick={() => onPick(board.id, cell)}
                draggable={card !== null}
                onDragStart={(event) => startCardDrag(event, { source: 'cell', boardId: board.id, cell })}
                onDragOver={(event) => handleDragOver(event, cell)}
                onDragLeave={() => setDropCell((current) => (current === cell ? null : current))}
                onDrop={(event) => handleDrop(event, cell)}
              >
                {card === null ? (
                  <FaPlus className="traditional-boards__cell-plus" aria-hidden="true" />
                ) : (
                  <img
                    className="board-thumbnail__card-image"
                    src={traditionalCardImage(card, 'screen')}
                    alt=""
                    loading="lazy"
                    draggable={false}
                  />
                )}
                {isFixed && (
                  <span className="traditional-boards__lock" aria-hidden="true">
                    <FaLock />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
      {sameAs.length > 0 && (
        <p className="traditional-boards__same" role="status">
          <FaExclamationTriangle aria-hidden="true" />{' '}
          {t('traditional.board.sameAs', { count: sameAs.length, boards: sameAs.join(', ') })}
        </p>
      )}
      <div className="traditional-boards__item-actions">
        {hasEmpty && (
          <button
            type="button"
            className="traditional-boards__item-button traditional-boards__item-button--fill"
            onClick={() => onFill(board.id)}
            aria-label={t('traditional.board.fillLabel', { number })}
          >
            <FaDice aria-hidden="true" /> {t('traditional.board.fill')}
          </button>
        )}
        <button
          type="button"
          className="traditional-boards__item-button"
          onClick={() => onShuffle(board.id)}
          aria-label={t('traditional.board.shuffleLabel', { number })}
        >
          <FaRandom aria-hidden="true" /> {t('traditional.board.shuffle')}
        </button>
        <button
          type="button"
          className="traditional-boards__item-button traditional-boards__item-button--danger"
          onClick={() => onDelete(board.id)}
          aria-label={t('traditional.board.deleteLabel', { number })}
        >
          <FaTrashAlt aria-hidden="true" /> {t('traditional.board.delete')}
        </button>
      </div>
    </li>
  );
};
