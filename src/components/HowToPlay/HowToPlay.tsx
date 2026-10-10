import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FaBullhorn, FaCircle, FaLayerGroup, FaThLarge } from 'react-icons/fa';
import type { FaqItem } from '../../utils/faqJsonLd';
import { minCardsForGrid } from '../../utils/gridRules';
import { BOARD_CELLS, PLAYS, boardCellTone } from '../../utils/playBoards';
import { FaqSection } from '../Faq/FaqSection';
import '../../fonts/arvoCarta.css';
import '../LandingPage/LandingPage.css';
import '../LandingPage/LandingFinalCta.css';
import '../LandingPage/PageHero.css';
import './HowToPlay.css';

const NEEDS = [
  { id: 'boards', Icon: FaThLarge },
  { id: 'deck', Icon: FaLayerGroup },
  { id: 'beans', Icon: FaCircle },
  { id: 'caller', Icon: FaBullhorn },
] as const;

const STEPS = ['deal', 'draw', 'mark', 'shout'] as const;

// Versos tradicionales, con el número que cada carta lleva en la baraja.
const VERSES = [
  { id: 'gallo', number: 1 },
  { id: 'dama', number: 3 },
  { id: 'sirena', number: 6 },
  { id: 'diablito', number: 2 },
] as const;

const FAQ_IDS = ['cards', 'board', 'chorro', 'shout', 'tie', 'markers'] as const;

/** P3 ¿Cómo se juega? (FEAT-33, US A5). */
export const HowToPlay = () => {
  const { t } = useTranslation();
  // Los mínimos de cartas salen de la misma regla que usa el generador de tableros.
  const minimums = { kids: minCardsForGrid(9), classic: minCardsForGrid(16) };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const faqItems: FaqItem[] = FAQ_IDS.map((id) => ({
    question: t(`howToPlay.faq.${id}.question`),
    answer: t(`howToPlay.faq.${id}.answer`, minimums),
  }));

  return (
    <main className="landing-page how-to-play">
      <section className="page-hero">
        <div className="page-hero__inner">
          <div className="page-hero__content">
            <h1 className="page-hero__title">{t('howToPlay.hero.title')}</h1>
            <p className="page-hero__description">{t('howToPlay.hero.description')}</p>
          </div>
          <div className="page-hero__media">
            <img
              className="page-hero__image"
              src="/media/inicio/mesa-loteria.jpg"
              alt={t('howToPlay.hero.imageAlt')}
              width={560}
              height={420}
            />
          </div>
        </div>
      </section>

      <section className="landing-section">
        <div className="landing-section__inner how-to-play__block">
          <h2 className="landing-section__title how-to-play__centered">{t('howToPlay.need.title')}</h2>
          <ul className="how-to-play__needs">
            {NEEDS.map(({ id, Icon }) => (
              <li key={id} className="how-to-play__need">
                <span className="how-to-play__need-icon">
                  <Icon aria-hidden="true" />
                </span>
                <h3 className="how-to-play__item-title">{t(`howToPlay.need.${id}.title`)}</h3>
                <p className="how-to-play__text">{t(`howToPlay.need.${id}.text`)}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="landing-section landing-section--band">
        <div className="landing-section__inner how-to-play__block">
          <h2 className="landing-section__title how-to-play__centered">{t('howToPlay.steps.title')}</h2>
          <ol className="how-to-play__steps">
            {STEPS.map((id, index) => (
              <li key={id} className="how-to-play__step">
                <span className="how-to-play__step-number" aria-hidden="true">
                  {index + 1}
                </span>
                <div>
                  <h3 className="how-to-play__item-title">{t(`howToPlay.steps.${id}.title`)}</h3>
                  <p className="how-to-play__text">{t(`howToPlay.steps.${id}.text`)}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="landing-section">
        <div className="landing-section__inner how-to-play__calling">
          <div className="how-to-play__calling-text">
            <h2 className="landing-section__title">{t('howToPlay.calling.title')}</h2>
            <p className="how-to-play__text how-to-play__text--large">{t('howToPlay.calling.text1')}</p>
            <p className="how-to-play__text how-to-play__text--large">{t('howToPlay.calling.text2')}</p>
          </div>
          <ul className="how-to-play__verses">
            {VERSES.map(({ id, number }) => (
              <li key={id} className="how-to-play__verse">
                <div className="how-to-play__verse-head">
                  <h3 className="how-to-play__verse-name">{t(`howToPlay.calling.${id}.name`)}</h3>
                  <span className="how-to-play__verse-number">{number}</span>
                </div>
                <p className="how-to-play__verse-text" lang="es">
                  {t(`howToPlay.calling.${id}.verse`)}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="landing-section landing-section--band">
        <div className="landing-section__inner how-to-play__block">
          <div className="landing-section__header">
            <h2 className="landing-section__title">{t('howToPlay.plays.title')}</h2>
            <p className="landing-section__subtitle">{t('howToPlay.plays.intro')}</p>
          </div>
          <ul className="how-to-play__plays">
            {PLAYS.map(({ id, marked }) => (
              <li key={id} className={`how-to-play__play ${id === 'lleno' ? 'how-to-play__play--main' : ''}`}>
                {id === 'lleno' && <span className="how-to-play__prize">{t('howToPlay.plays.mainPrize')}</span>}
                {/* El tablero es un dibujo: quien no lo ve recibe su descripción. */}
                <div className="how-to-play__board" role="img" aria-label={t(`howToPlay.plays.${id}.boardAlt`)}>
                  {BOARD_CELLS.map((cell) => (
                    <span
                      key={cell}
                      className={[
                        'how-to-play__cell',
                        `how-to-play__cell--tone-${boardCellTone(cell)}`,
                        marked.includes(cell) ? 'how-to-play__cell--marked' : '',
                      ].join(' ')}
                    />
                  ))}
                </div>
                <h3 className="how-to-play__item-title">{t(`howToPlay.plays.${id}.title`)}</h3>
                <p className="how-to-play__text">{t(`howToPlay.plays.${id}.text`)}</p>
              </li>
            ))}
          </ul>
          <p className="how-to-play__text how-to-play__centered">{t('howToPlay.plays.others')}</p>
        </div>
      </section>

      <section className="landing-section">
        <div className="landing-section__inner how-to-play__pair">
          <div className="how-to-play__card how-to-play__card--dark">
            <h2 className="how-to-play__buenas">{t('howToPlay.buenas.title')}</h2>
            <p className="how-to-play__card-text">{t('howToPlay.buenas.text')}</p>
          </div>
          <div className="how-to-play__card">
            <h2 className="how-to-play__card-title">{t('howToPlay.bet.title')}</h2>
            <p className="how-to-play__card-text">{t('howToPlay.bet.text')}</p>
          </div>
        </div>
      </section>

      <section className="landing-section landing-section--band">
        <div className="landing-section__inner how-to-play__pair">
          <div className="how-to-play__card">
            <span className="how-to-play__tag how-to-play__tag--kids">{t('howToPlay.kids.tag')}</span>
            <h2 className="how-to-play__card-title">{t('howToPlay.kids.title')}</h2>
            <p className="how-to-play__card-text">{t('howToPlay.kids.text', minimums)}</p>
          </div>
          <div className="how-to-play__card">
            <span className="how-to-play__tag">{t('howToPlay.howMany.tag')}</span>
            <h2 className="how-to-play__card-title">{t('howToPlay.howMany.title')}</h2>
            <p className="how-to-play__card-text">{t('howToPlay.howMany.text', minimums)}</p>
          </div>
        </div>
      </section>

      <FaqSection title={t('howToPlay.faq.title')} items={faqItems} />

      <section className="landing-final-cta">
        <div className="landing-final-cta__box">
          <h2 className="landing-final-cta__title">{t('howToPlay.cta.title')}</h2>
          <p className="landing-final-cta__description">{t('howToPlay.cta.text')}</p>
          <div className="how-to-play__cta-actions">
            <Link to="/cards" className="landing-cta-button how-to-play__cta-link">
              {t('howToPlay.cta.create')} <span aria-hidden="true">→</span>
            </Link>
            <Link to="/tematicas" className="how-to-play__cta-link how-to-play__cta-link--outline">
              {t('howToPlay.cta.themed')}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
};
