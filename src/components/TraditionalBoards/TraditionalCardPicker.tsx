import { useTranslation } from 'react-i18next';
import { FaLock, FaLockOpen, FaTimes } from 'react-icons/fa';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import { usePageScrollLock } from '../../hooks/usePageScrollLock';
import { TRADITIONAL_DECK } from '../../utils/traditionalDeck';
import { traditionalCardImage, type TraditionalCell } from '../../utils/traditionalBoards';

interface TraditionalCardPickerProps {
  boardNumber: number;
  cell: number;
  /** Las cartas del tablero, en el orden de sus casillas. */
  boardCards: readonly TraditionalCell[];
  /** Si la carta de la casilla está fijada (US A3). */
  isFixed: boolean;
  onChoose: (card: number) => void;
  onToggleFixed: () => void;
  onClose: () => void;
}

/**
 * Elegir la carta de una casilla tocándola (FEAT-53, US A2). Las que ya están en el tablero se marcan:
 * elegir una de ellas intercambia las dos casillas. Desde aquí también se fija o se suelta la carta (US A3).
 */
export const TraditionalCardPicker = ({
  boardNumber,
  cell,
  boardCards,
  isFixed,
  onChoose,
  onToggleFixed,
  onClose,
}: TraditionalCardPickerProps) => {
  const { t } = useTranslation();
  useEscapeKey(onClose);
  usePageScrollLock();
  const current = boardCards[cell];

  return (
    <div
      className="traditional-picker__overlay"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="traditional-picker" role="dialog" aria-modal="true" aria-labelledby="traditional-picker-title">
        <div className="traditional-picker__head">
          <div>
            <h2 id="traditional-picker-title" className="traditional-picker__title">
              {t('traditional.picker.title', { cell: cell + 1, board: boardNumber })}
            </h2>
            <p className="traditional-picker__hint">{t('traditional.picker.hint')}</p>
            {current !== null && (
              <button
                type="button"
                className={`traditional-picker__fix${isFixed ? ' traditional-picker__fix--on' : ''}`}
                onClick={onToggleFixed}
                aria-pressed={isFixed}
              >
                {isFixed ? <FaLock aria-hidden="true" /> : <FaLockOpen aria-hidden="true" />}{' '}
                {t(isFixed ? 'traditional.picker.unfix' : 'traditional.picker.fix', { name: TRADITIONAL_DECK[current - 1] })}
              </button>
            )}
          </div>
          <button
            type="button"
            className="traditional-picker__close"
            onClick={onClose}
            aria-label={t('common.close')}
            autoFocus
          >
            <FaTimes aria-hidden="true" />
          </button>
        </div>
        <ul className="traditional-picker__grid">
          {TRADITIONAL_DECK.map((name, i) => {
            const card = i + 1;
            const tag =
              card === current ? t('traditional.picker.here') : boardCards.includes(card) ? t('traditional.picker.onBoard') : null;
            return (
              <li key={name}>
                <button
                  type="button"
                  className={`traditional-picker__card${card === current ? ' traditional-picker__card--current' : ''}`}
                  onClick={() => onChoose(card)}
                  aria-label={tag ? `${name} (${tag})` : name}
                >
                  <img src={traditionalCardImage(card, 'screen')} alt="" loading="lazy" />
                  {tag && <span className="traditional-picker__tag">{tag}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};
