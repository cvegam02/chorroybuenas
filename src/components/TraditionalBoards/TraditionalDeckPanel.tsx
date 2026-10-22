import { useTranslation } from 'react-i18next';
import { TRADITIONAL_DECK } from '../../utils/traditionalDeck';
import { traditionalCardImage } from '../../utils/traditionalBoards';
import { startCardDrag } from './cardDrag';

/** La baraja de 54 a un lado, en computadora: de aquí se arrastran cartas a las casillas (FEAT-53, US A2). */
export const TraditionalDeckPanel = () => {
  const { t } = useTranslation();

  return (
    <aside className="traditional-deck" aria-labelledby="traditional-deck-title">
      <div className="traditional-deck__head">
        <h2 id="traditional-deck-title" className="traditional-deck__title">
          {t('traditional.deck.title')}
        </h2>
        <p className="traditional-deck__hint">{t('traditional.deck.hint')}</p>
      </div>
      <ul className="traditional-deck__grid">
        {TRADITIONAL_DECK.map((name, i) => (
          <li key={name}>
            <img
              className="traditional-deck__card"
              src={traditionalCardImage(i + 1, 'screen')}
              alt={name}
              title={name}
              loading="lazy"
              draggable
              onDragStart={(event) => startCardDrag(event, { source: 'deck', card: i + 1 })}
            />
          </li>
        ))}
      </ul>
    </aside>
  );
};
