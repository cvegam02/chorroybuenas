import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { FaTimes } from 'react-icons/fa';
import type { Card } from '../../types';
import { useComposedCard } from '../../hooks/useComposedCard';
import { useEscapeKey } from '../../hooks/useEscapeKey';

interface CallerThumbProps {
  card: Card;
  /** Su número de salida; sin él, la carta todavía no se canta. */
  callNumber?: number;
  onOpen?: () => void;
  /** Es la que se ve en grande (panel de computadora). */
  isShown?: boolean;
}

/** Una carta chica del historial, como sale impresa. */
const CallerThumb = ({ card, callNumber, onOpen, isShown = false }: CallerThumbProps) => {
  const composedUrl = useComposedCard(card);
  const pending = callNumber === undefined;
  const label = pending ? card.title : `${callNumber}. ${card.title}`;
  const content = (
    <>
      <img src={composedUrl ?? card.image} alt={onOpen ? '' : label} />
      {!pending && <span className="caller__thumb-number" aria-hidden={!onOpen}>{callNumber}</span>}
    </>
  );
  // Sin `onOpen` (en «Ver todas», que solo informa) la carta no se puede tocar
  if (!onOpen) return <span className="caller__thumb">{content}</span>;
  return (
    <button
      type="button"
      className={`caller__thumb${isShown ? ' caller__thumb--shown' : ''}`}
      onClick={onOpen}
      aria-label={label}
      aria-current={isShown || undefined}
    >
      {content}
    </button>
  );
};

interface CallerHistoryStripProps {
  /** Las anteriores a la actual, de la más vieja a la más reciente: las nuevas entran por la derecha. */
  cards: Card[];
  callNumbers: Map<string, number>;
  onOpenCard: (card: Card) => void;
  onSeeAll: () => void;
}

/** La tira bajo la carta con las últimas cantadas y «Ver todas» (US A3). */
export const CallerHistoryStrip = ({ cards, callNumbers, onOpenCard, onSeeAll }: CallerHistoryStripProps) => {
  const { t } = useTranslation();
  return (
    <div className="caller__history">
      {cards.length > 0 && (
        <div className="caller__history-cards" aria-label={t('caller.history')}>
          {cards.map((card) => (
            <CallerThumb key={card.id} card={card} callNumber={callNumbers.get(card.id)} onOpen={() => onOpenCard(card)} />
          ))}
        </div>
      )}
      <button type="button" className="caller__button caller__history-all" onClick={onSeeAll}>
        {t('caller.seeAll')}
      </button>
    </div>
  );
};

interface CallerCalledPanelProps {
  /** Todas las cantadas, la más reciente primero. */
  cards: Card[];
  callNumbers: Map<string, number>;
  total: number;
  /** La que se ve en grande, para marcarla. */
  shownId: string;
  onOpenCard: (card: Card) => void;
  onSeeAll: () => void;
}

/** En computadora, a la derecha de la carta: todas las cantadas con su número de salida (FEAT-59, US A1). */
export const CallerCalledPanel = ({ cards, callNumbers, total, shownId, onOpenCard, onSeeAll }: CallerCalledPanelProps) => {
  const { t } = useTranslation();
  return (
    <aside className="caller__panel" aria-labelledby="caller-panel-title">
      <header className="caller__panel-top">
        <h2 id="caller-panel-title" className="caller__panel-title">
          {t('caller.deckTitle', { drawn: cards.length, total })}
        </h2>
        <button type="button" className="caller__button caller__history-all" onClick={onSeeAll}>
          {t('caller.seeAll')}
        </button>
      </header>
      <div className="caller__panel-grid">
        {cards.map((card) => (
          <CallerThumb
            key={card.id}
            card={card}
            callNumber={callNumbers.get(card.id)}
            onOpen={() => onOpenCard(card)}
            isShown={card.id === shownId}
          />
        ))}
      </div>
    </aside>
  );
};

interface CallerDeckSheetProps {
  /** Toda la baraja, en el orden de la lotería. */
  cards: Card[];
  callNumbers: Map<string, number>;
  onClose: () => void;
}

/** «Ver todas», solo informativa: la baraja en dos grupos, las que ya salieron con su número de salida y las que faltan (US A3). */
export const CallerDeckSheet = ({ cards, callNumbers, onClose }: CallerDeckSheetProps) => {
  const { t } = useTranslation();
  useEscapeKey(onClose);
  // Agrupadas para ver de un vistazo cuáles salieron: las cantadas en el orden en que salieron, y las que faltan
  const called = cards
    .filter((card) => callNumbers.has(card.id))
    .sort((a, b) => (callNumbers.get(a.id) ?? 0) - (callNumbers.get(b.id) ?? 0));
  const pending = cards.filter((card) => !callNumbers.has(card.id));

  return createPortal(
    <div className="caller__deck" role="dialog" aria-modal="true" aria-labelledby="caller-deck-title">
      <header className="caller__deck-top">
        <h2 id="caller-deck-title" className="caller__deck-title">
          {t('caller.deckTitle', { drawn: callNumbers.size, total: cards.length })}
        </h2>
        <button type="button" className="caller__icon-button" onClick={onClose} aria-label={t('common.close')} autoFocus>
          <FaTimes aria-hidden="true" />
        </button>
      </header>
      {called.length > 0 && (
        <section className="caller__deck-group">
          <h3 className="caller__deck-group-title">{t('caller.deckCalled', { count: called.length })}</h3>
          <div className="caller__deck-grid">
            {called.map((card) => (
              <CallerThumb key={card.id} card={card} callNumber={callNumbers.get(card.id)} />
            ))}
          </div>
        </section>
      )}
      {pending.length > 0 && (
        <section className="caller__deck-group">
          <h3 className="caller__deck-group-title">{t('caller.deckPending', { count: pending.length })}</h3>
          <div className="caller__deck-grid">
            {pending.map((card) => (
              <CallerThumb key={card.id} card={card} />
            ))}
          </div>
        </section>
      )}
    </div>,
    document.body,
  );
};
