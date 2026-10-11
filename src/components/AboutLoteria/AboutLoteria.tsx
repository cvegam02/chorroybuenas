import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CLASSIC_CARDS, classicCardsByNumber } from '../../utils/classicCards';
import type { FaqItem } from '../../utils/faqJsonLd';
import { TRADITIONAL_DECK } from '../../utils/traditionalDeck';
import { FaqSection } from '../Faq/FaqSection';
import '../../fonts/arvoCarta.css';
import '../LandingPage/LandingPage.css';
import '../LandingPage/LandingShowcase.css';
import '../LandingPage/LandingFinalCta.css';
import '../LandingPage/PageHero.css';
import './AboutLoteria.css';

// Cartas clásicas con ilustración propia (decisión 55), por su número en la baraja.
const HERO_FAN = classicCardsByNumber([1, 3, 4, 6]);
const SHEET_CARDS = classicCardsByNumber([1, 6, 3, 4, 2, 11, 9, 12, 7]);

const STATS = [
  { id: 'cards', value: '54' },
  { id: 'board', value: '4×4' },
  { id: 'caller', value: '1' },
  { id: 'generations', value: '∞' },
] as const;

const HISTORY = ['europe', 'colonial', 'mexican', 'today'] as const;
const FAQ_IDS = ['what', 'bingo', 'cards', 'origin', 'own'] as const;

/** P4 ¿Qué es la lotería? (FEAT-33, US A6). */
export const AboutLoteria = () => {
  const { t } = useTranslation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const faqItems: FaqItem[] = FAQ_IDS.map((id) => ({
    question: t(`about.faq.${id}.question`),
    answer: t(`about.faq.${id}.answer`),
  }));

  return (
    <main className="landing-page about-loteria">
      <section className="page-hero">
        <div className="page-hero__inner">
          <div className="page-hero__content">
            <h1 className="page-hero__title">{t('about.hero.title')}</h1>
            <p className="page-hero__description">{t('about.hero.description')}</p>
          </div>
          <div className="page-hero__media">
            <div className="about-loteria__fan">
              {HERO_FAN.map((card) => (
                <img
                  key={card.number}
                  className="about-loteria__fan-card"
                  src={card.src}
                  alt={t('about.deck.cardAlt', { name: card.name })}
                  width={170}
                  height={255}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section" aria-label={t('about.stats.label')}>
        <ul className="landing-section__inner about-loteria__stats">
          {STATS.map(({ id, value }) => (
            <li key={id} className="about-loteria__stat">
              <span className="about-loteria__stat-value">{value}</span>
              <span className="about-loteria__stat-label">{t(`about.stats.${id}`)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="landing-section landing-section--band">
        <div className="landing-section__inner about-loteria__history">
          <div className="about-loteria__history-text">
            <div>
              <h2 className="landing-section__title">{t('about.history.title')}</h2>
              <p className="about-loteria__intro">{t('about.history.intro')}</p>
            </div>
            <ol className="about-loteria__timeline">
              {HISTORY.map((id) => (
                <li key={id} className="about-loteria__stage">
                  <h3 className="about-loteria__stage-title">{t(`about.history.${id}.title`)}</h3>
                  <p className="about-loteria__stage-text">{t(`about.history.${id}.text`)}</p>
                </li>
              ))}
            </ol>
          </div>
          {/* Una hoja de lotería dibujada con HTML y CSS, con nueve de las cartas clásicas. */}
          <div className="about-loteria__sheet" role="group" aria-label={t('about.history.sheetLabel')}>
            <p className="about-loteria__sheet-title" lang="es" aria-hidden="true">
              LOTERÍA
            </p>
            <ul className="about-loteria__sheet-grid">
              {SHEET_CARDS.map((card) => (
                <li key={card.number}>
                  <img
                    className="about-loteria__sheet-card"
                    src={card.src}
                    alt={t('about.deck.cardAlt', { name: card.name })}
                    width={600}
                    height={900}
                    loading="lazy"
                  />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="landing-section">
        <div className="landing-section__inner">
          <div className="about-loteria__culture">
            <h2 className="about-loteria__culture-title">{t('about.culture.title')}</h2>
            <p className="about-loteria__culture-text">{t('about.culture.text')}</p>
          </div>
        </div>
      </section>

      <section className="landing-section landing-section--band">
        <div className="landing-section__inner about-loteria__deck">
          <div className="landing-section__header">
            <h2 className="landing-section__title">{t('about.deck.title')}</h2>
            <p className="landing-section__subtitle">{t('about.deck.intro')}</p>
          </div>
          {/* La fila se desliza de lado: con tabIndex también se puede recorrer con el teclado. */}
          <ul className="landing-showcase__row about-loteria__classic-row" tabIndex={0} aria-label={t('about.deck.cardsLabel')}>
            {CLASSIC_CARDS.map((card) => (
              <li key={card.number} className="landing-showcase__item">
                <img
                  className="landing-showcase__card"
                  src={card.src}
                  alt={t('about.deck.cardAlt', { name: card.name })}
                  width={170}
                  height={255}
                  loading="lazy"
                />
              </li>
            ))}
          </ul>
          <ol className="about-loteria__deck-list" lang="es">
            {TRADITIONAL_DECK.map((name, index) => (
              <li key={name} className="about-loteria__deck-card">
                <span className="about-loteria__deck-number" aria-hidden="true">
                  {index + 1}
                </span>
                <span className="about-loteria__deck-name">{name}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <FaqSection title={t('about.faq.title')} items={faqItems} />

      <section className="landing-final-cta">
        <div className="landing-final-cta__box">
          <h2 className="landing-final-cta__title">{t('about.cta.title')}</h2>
          <p className="landing-final-cta__description">{t('about.cta.text')}</p>
          <div className="landing-final-cta__actions">
            <Link to="/cards" className="landing-cta-button landing-final-cta__link">
              {t('about.cta.create')} <span aria-hidden="true">→</span>
            </Link>
            <Link to="/como-se-juega" className="landing-final-cta__link landing-final-cta__link--outline">
              {t('about.cta.learn')}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
};
