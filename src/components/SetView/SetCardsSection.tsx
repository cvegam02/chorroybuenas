import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FaPencilAlt, FaPlus } from 'react-icons/fa';
import type { Card, GridSize } from '../../types';
import { uploaderName, type LoteriaMember } from '../../utils/guestCards';
import { SetCardThumb } from './SetCardThumb';
import { missingCardNumbers, type SetViewState } from './setViewState';
import './SetCardsSection.css';

interface SetCardsSectionProps {
  cards: Card[];
  state: SetViewState;
  gridSize: GridSize;
  /** Quiénes participan en la lotería colectiva, para decir quién subió cada carta (FEAT-56). */
  members: ReadonlyMap<string, LoteriaMember>;
  /** Cartas de invitados nuevas en esta visita (FEAT-56). */
  newCardIds: ReadonlySet<string>;
  /** Abre la carta grande; recibe su lugar en la lista, empezando en 0. */
  onOpenCard: (index: number) => void;
}

/** Las cartas de una lotería guardada: todas, y un espacio punteado por cada una que falta para el mínimo. */
export const SetCardsSection = ({ cards, state, gridSize, members, newCardIds, onOpenCard }: SetCardsSectionProps) => {
  const { t } = useTranslation();
  const aiCount = cards.filter((card) => card.isAiGenerated).length;
  const cardsLink = { to: '/cards', state: { gridSize } };

  // Solo las cartas de invitados dicen quién las subió; las del dueño no llevan nada
  const uploaderLabel = (card: Card) => {
    if (!card.uploadedBy) return undefined;
    const uploader = uploaderName(card.uploadedBy, members);
    return uploader.kind === 'named' ? t('guest.uploadedBy', { name: uploader.name }) : t('guest.uploadedByGuest');
  };

  return (
    <section className="set-section">
      <div className="set-section__header">
        <div className="set-section__heading">
          <h2 className="set-section__title">{t('setView.cardsTitle')}</h2>
          <span className="set-section__count">
            {aiCount > 0 ? t('setView.cardsCountWithAi', { cards: cards.length, ai: aiCount }) : cards.length}
          </span>
        </div>
        {state.kind === 'missingCards' && (
          <Link {...cardsLink} className="set-button set-button--secondary set-button--small">
            <FaPencilAlt aria-hidden="true" />
            {t('setView.editCards')}
          </Link>
        )}
      </div>

      <div className="set-cards__grid">
        {cards.map((card, index) => (
          <SetCardThumb
            key={card.id}
            card={card}
            uploaderLabel={uploaderLabel(card)}
            isNew={newCardIds.has(card.id)}
            onOpen={() => onOpenCard(index)}
          />
        ))}
        {missingCardNumbers(state, cards.length).map((number) => (
          <Link
            key={number}
            {...cardsLink}
            className="set-cards__slot"
            aria-label={t('setView.addCardSlot', { number })}
          >
            <FaPlus aria-hidden="true" />
            <span aria-hidden="true">{number}</span>
          </Link>
        ))}
      </div>

      <p className="set-section__note">
        {state.kind === 'missingCards' ? t('setView.missingCardsNote', { min: state.min }) : t('setView.cardsNote')}
      </p>
    </section>
  );
};
