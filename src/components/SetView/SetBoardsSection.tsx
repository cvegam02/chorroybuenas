import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FaRandom } from 'react-icons/fa';
import type { Board, GridSize } from '../../types';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { BoardThumbnail } from '../BoardGenerator/BoardThumbnail';
import type { SetViewState } from './setViewState';
import './SetBoardsSection.css';

interface SetBoardsSectionProps {
  boards: Board[];
  state: SetViewState;
  gridSize: GridSize;
  /** Abre el tablero grande; recibe su lugar en la lista, empezando en 0. */
  onOpenBoard: (index: number) => void;
  onShuffle: () => void;
}

/** Tablerito dibujado, sin cartas: adorna el bloque de «todavía no hay tableros». */
const BlankBoard = ({ gridSize }: { gridSize: GridSize }) => (
  <span className={`set-boards__blank ${gridSize === 9 ? 'set-boards__blank--kids' : ''}`}>
    {Array.from({ length: gridSize }, (_, index) => (
      <span key={index} className="set-boards__blank-cell" />
    ))}
  </span>
);

/**
 * Los tableros de una lotería guardada. Sin tableros muestra un bloque punteado: con el botón para armarlos
 * si las cartas ya alcanzan, o bloqueado mientras falten cartas.
 */
export const SetBoardsSection = ({ boards, state, gridSize, onOpenBoard, onShuffle }: SetBoardsSectionProps) => {
  const { t } = useTranslation();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const hasBoards = boards.length > 0;

  return (
    <section className="set-section">
      <div className="set-section__header">
        <div className="set-section__heading">
          <h2 className="set-section__title">{t('setView.boardsTitle')}</h2>
          <span className="set-section__count">{hasBoards ? boards.length : t('setView.boardsNotYet')}</span>
        </div>
        {hasBoards && (
          <button type="button" className="set-button set-button--secondary set-button--small" onClick={onShuffle}>
            <FaRandom aria-hidden="true" />
            {t('setView.shuffleBoards')}
          </button>
        )}
      </div>

      {hasBoards ? (
        <>
          <div className="set-boards__grid">
            {boards.map((board, index) => (
              <div key={board.id} className="set-boards__item">
                <BoardThumbnail board={board} index={index} onClick={() => onOpenBoard(index)} />
              </div>
            ))}
          </div>
          <p className="set-section__note">
            {isMobile ? t('setView.boardsNoteMobile', { count: boards.length }) : t('setView.boardsNote')}
          </p>
        </>
      ) : (
        <div className="set-boards__empty">
          <span className="set-boards__blanks" aria-hidden="true">
            <BlankBoard gridSize={gridSize} />
            <BlankBoard gridSize={gridSize} />
          </span>
          <div className="set-boards__empty-text">
            <strong className="set-boards__empty-title">
              {state.kind === 'missingCards'
                ? t('setView.boardsLockedTitle', { min: state.min })
                : t('setView.noBoardsTitle')}
            </strong>
            <span>{state.kind === 'missingCards' ? t('setView.boardsLockedText') : t('setView.missingBoardsText')}</span>
          </div>
          {state.kind === 'missingCards' ? (
            <button type="button" className="set-button set-boards__locked-button" disabled>
              {t('setView.buildBoards')}
            </button>
          ) : (
            <Link to="/board-count" state={{ gridSize }} className="set-button set-button--primary">
              {t('setView.buildBoards')}
            </Link>
          )}
        </div>
      )}
    </section>
  );
};
