import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FaArrowRight, FaCheck, FaThLarge } from 'react-icons/fa';
import type { GridSize } from '../../types';
import { minCardsForGrid } from '../../utils/gridRules';
import type { SetViewState } from './setViewState';
import './SetStatusNotice.css';

interface SetStatusNoticeProps {
  state: SetViewState;
  gridSize: GridSize;
  cardCount: number;
  boardCount: number;
}

/** El aviso bajo el encabezado: lista para imprimir, faltan los tableros o faltan cartas. */
export const SetStatusNotice = ({ state, gridSize, cardCount, boardCount }: SetStatusNoticeProps) => {
  const { t } = useTranslation();

  if (state.kind === 'ready') {
    return (
      <div className="set-status set-status--ready">
        <span className="set-status__icon set-status__icon--round" aria-hidden="true">
          <FaCheck />
        </span>
        <div className="set-status__text">
          <strong className="set-status__title">{t('dashboard.loterias.statusReady')}</strong>
          <span>{t('setView.readyText', { count: boardCount, cards: cardCount })}</span>
        </div>
        <Link to="/como-se-juega" className="set-status__link">
          {t('setView.howToPlay')}
          <FaArrowRight aria-hidden="true" />
        </Link>
      </div>
    );
  }

  if (state.kind === 'missingBoards') {
    return (
      <div className="set-status set-status--boards">
        <span className="set-status__icon" aria-hidden="true">
          <FaThLarge />
        </span>
        <div className="set-status__text">
          <strong className="set-status__title">{t('setView.missingBoardsTitle', { cards: cardCount })}</strong>
          <span>{t('setView.missingBoardsText')}</span>
        </div>
        <Link to="/board-count" state={{ gridSize }} className="set-button set-button--primary">
          {t('setView.buildBoards')}
        </Link>
      </div>
    );
  }

  return (
    <div className="set-status set-status--cards">
      <div className="set-status__progress">
        <div className="set-status__progress-header">
          <strong className="set-status__title">{t('setView.missingCardsTitle', { count: state.missing })}</strong>
          <span className="set-status__count">{t('setView.cardsProgress', { cards: cardCount, min: state.min })}</span>
        </div>
        <div
          className="set-status__bar"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={state.min}
          aria-valuenow={cardCount}
          aria-label={t('setView.cardsProgressLabel')}
        >
          <div className="set-status__bar-fill" style={{ width: `${(cardCount / state.min) * 100}%` }} />
        </div>
        <span className="set-status__hint">
          {t('setView.minCardsHint', { kids: minCardsForGrid(9), classic: minCardsForGrid(16) })}
        </span>
      </div>
      <Link to="/cards" state={{ gridSize }} className="set-button set-button--primary">
        {t('setView.addPhotos')}
      </Link>
    </div>
  );
};
