import type { IconType } from 'react-icons';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FaCheck, FaPrint, FaRegClone, FaThLarge } from 'react-icons/fa';
import './SeasonalDetailExtras.css';

interface SeasonalIncludesProps {
  /** «Clásico 4×4» o «Niños 3×3», ya traducido. */
  mode: string;
  cardCount: number | null;
  boardCount: number | null;
}

interface IncludedItem {
  key: string;
  Icon: IconType;
  title: string;
  text: string;
}

/** «Qué incluye el PDF»: las tarjetas de tableros y de cartas solo salen si la ficha trae el número. */
export const SeasonalIncludes = ({ mode, cardCount, boardCount }: SeasonalIncludesProps) => {
  const { t } = useTranslation();
  const items: IncludedItem[] = [
    ...(boardCount !== null
      ? [
          {
            key: 'boards',
            Icon: FaThLarge,
            title: t('seasonal.boards', { count: boardCount }),
            text: t('seasonal.detail.includes.boardsText', { mode }),
          },
        ]
      : []),
    ...(cardCount !== null
      ? [
          {
            key: 'cards',
            Icon: FaRegClone,
            title: t('seasonal.detail.includes.cardsTitle', { count: cardCount }),
            text: t('seasonal.detail.includes.cardsText'),
          },
        ]
      : []),
    {
      key: 'letter',
      Icon: FaPrint,
      title: t('seasonal.detail.includes.letterTitle'),
      text: t('seasonal.detail.includes.letterText'),
    },
    {
      key: 'clean',
      Icon: FaCheck,
      title: t('seasonal.detail.includes.cleanTitle'),
      text: t('seasonal.detail.includes.cleanText'),
    },
  ];

  return (
    <section className="seasonal-includes" aria-labelledby="seasonal-detail-includes">
      <h2 id="seasonal-detail-includes" className="seasonal-includes__title">
        {t('seasonal.detail.includesTitle')}
      </h2>
      <ul className="seasonal-includes__list">
        {items.map(({ key, Icon, title, text }) => (
          <li key={key} className="seasonal-includes__item">
            <span className="seasonal-includes__icon" aria-hidden="true">
              <Icon />
            </span>
            <div>
              <strong className="seasonal-includes__name">{title}</strong>
              <p className="seasonal-includes__text">{text}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
};

/** Los dos bloques del final: aprender a jugar y crear la lotería propia. */
export const SeasonalDetailLinks = () => {
  const { t } = useTranslation();
  return (
    <div className="seasonal-links">
      <section className="seasonal-links__block seasonal-links__block--play">
        <h2 className="seasonal-links__title">{t('seasonal.detail.firstTime.title')}</h2>
        <p className="seasonal-links__text">{t('seasonal.detail.firstTime.text')}</p>
        <Link to="/como-se-juega" className="seasonal-links__link">
          {t('seasonal.detail.firstTime.cta')} <span aria-hidden="true">→</span>
        </Link>
      </section>

      <section className="seasonal-links__block seasonal-links__block--photos">
        <div className="seasonal-links__cards" aria-hidden="true">
          <img className="seasonal-links__card" src="/media/inicio/cartas/carta-05.jpg" alt="" width={62} height={93} loading="lazy" />
          <img className="seasonal-links__card" src="/media/inicio/cartas/carta-03.jpg" alt="" width={62} height={93} loading="lazy" />
        </div>
        <div className="seasonal-links__body">
          <h2 className="seasonal-links__title">{t('seasonal.detail.ownPhotos.title')}</h2>
          <p className="seasonal-links__text">{t('seasonal.detail.ownPhotos.text')}</p>
          <Link to="/cards" className="seasonal-links__link">
            {t('seasonal.detail.ownPhotos.cta')} <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>
    </div>
  );
};
