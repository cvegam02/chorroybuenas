import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  FaGamepad,
  FaBook,
  FaHeart,
  FaArrowRight,
  FaStar,
  FaImage,
  FaPalette,
  FaBullseye,
  FaFilePdf,
  FaCamera,
  FaDice,
  FaDownload,
  FaBaby,
  FaUsers,
  FaBriefcase,
  FaSmile,
  FaBirthdayCake,
  FaChild
} from 'react-icons/fa';
import './LandingPage.css';
import logoImage from '../../img/logo.png';

interface LandingPageProps {
  onStart: () => void;
}

export const LandingPage = ({ onStart }: LandingPageProps) => {
  const { t } = useTranslation();

  useEffect(() => {
    document.title = t('landing.title');
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', t('landing.metaDescription'));
    }
  }, [t]);

  return (
    <div className="landing-page">
      {/* Hero Section - Full Width con Imagen de Fondo */}
      <section className="landing-page__hero">
        <div className="landing-page__hero-overlay"></div>
        <div className="landing-page__hero-content">
          <div className="landing-page__hero-badge">
            <FaStar />
            <span>{t('landing.hero.badge')}</span>
          </div>
          <h1 className="landing-page__hero-title">
            {t('landing.hero.title')}<br />
            <span className="landing-page__hero-title--highlight">{t('landing.hero.titleHighlight')}</span>
          </h1>
          <p className="landing-page__hero-description">
            {t('landing.hero.description')}
          </p>
          <button
            onClick={onStart}
            className="landing-page__cta-button landing-page__cta-button--hero"
          >
            {t('landing.hero.cta')}
            <FaArrowRight />
          </button>
        </div>
        <div className="landing-page__hero-logo">
          <img src={logoImage} alt="chorroybuenas.com.mx" />
        </div>
        <div className="landing-page__hero-visual">
          <div className="landing-page__hero-card landing-page__hero-card--1"></div>
          <div className="landing-page__hero-card landing-page__hero-card--2"></div>
          <div className="landing-page__hero-card landing-page__hero-card--3"></div>
        </div>
      </section>

      <main className="landing-page__main">
        {/* Features Section */}
        <section className="landing-page__features">
          <div className="landing-page__features-container">
            <div className="landing-page__features-image">
              <img src="/amigos.png" alt={t('landing.features.title')} />
            </div>
            <div className="landing-page__features-content">
              <div className="landing-page__section-header">
                <h2 className="landing-page__section-title">{t('landing.features.title')}</h2>
                <p className="landing-page__section-subtitle">
                  {t('landing.features.subtitle')}
                </p>
              </div>
              <div className="landing-page__features-list">
                <div className="landing-page__feature-item">
                  <div className="landing-page__feature-icon">
                    <FaImage />
                  </div>
                  <div className="landing-page__feature-text">
                    <h3>{t('landing.features.customizable.title')}</h3>
                    <p>{t('landing.features.customizable.description')}</p>
                  </div>
                </div>
                <div className="landing-page__feature-item">
                  <div className="landing-page__feature-icon">
                    <FaPalette />
                  </div>
                  <div className="landing-page__feature-text">
                    <h3>{t('landing.features.editor.title')}</h3>
                    <p>{t('landing.features.editor.description')}</p>
                  </div>
                </div>
                <div className="landing-page__feature-item">
                  <div className="landing-page__feature-icon">
                    <FaBullseye />
                  </div>
                  <div className="landing-page__feature-text">
                    <h3>{t('landing.features.boards.title')}</h3>
                    <p>{t('landing.features.boards.description')}</p>
                  </div>
                </div>
                <div className="landing-page__feature-item">
                  <div className="landing-page__feature-icon">
                    <FaFilePdf />
                  </div>
                  <div className="landing-page__feature-text">
                    <h3>{t('landing.features.pdf.title')}</h3>
                    <p>{t('landing.features.pdf.description')}</p>
                  </div>
                </div>
                <div className="landing-page__feature-item">
                  <div className="landing-page__feature-icon">
                    <FaChild />
                  </div>
                  <div className="landing-page__feature-text">
                    <h3>{t('landing.features.kids.title')}</h3>
                    <p>{t('landing.features.kids.description')}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Steps - Horizontal Bar */}
        <section className="landing-page__steps">
          <div className="landing-page__steps-header">
            <h2 className="landing-page__steps-title">{t('landing.steps.title')}</h2>
            <p className="landing-page__steps-subtitle">
              {t('landing.steps.subtitle')}
            </p>
          </div>
          <div className="landing-page__steps-decorative"></div>
          <div className="landing-page__steps-container">
            <div className="landing-page__step">
              <div className="landing-page__step-number">1</div>
              <div className="landing-page__step-icon">
                <FaCamera />
              </div>
              <div className="landing-page__step-content">
                <h3>{t('landing.steps.step1.title')}</h3>
                <p>{t('landing.steps.step1.description')}</p>
              </div>
              <div className="landing-page__step-arrow">→</div>
            </div>
            <div className="landing-page__step">
              <div className="landing-page__step-number">2</div>
              <div className="landing-page__step-icon">
                <FaDice />
              </div>
              <div className="landing-page__step-content">
                <h3>{t('landing.steps.step2.title')}</h3>
                <p>{t('landing.steps.step2.description')}</p>
              </div>
              <div className="landing-page__step-arrow">→</div>
            </div>
            <div className="landing-page__step">
              <div className="landing-page__step-number">3</div>
              <div className="landing-page__step-icon">
                <FaDownload />
              </div>
              <div className="landing-page__step-content">
                <h3>{t('landing.steps.step3.title')}</h3>
                <p>{t('landing.steps.step3.description')}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Events Section */}
        <section className="landing-page__events">
          <div className="landing-page__section-header">
            <h2 className="landing-page__section-title">{t('landing.events.title')}</h2>
            <p className="landing-page__section-subtitle">
              {t('landing.events.subtitle')}
            </p>
          </div>
          <div className="landing-page__events-grid">
            <div className="landing-page__event">
              <div className="landing-page__event-icon">
                <FaBaby />
              </div>
              <div className="landing-page__event-content">
                <h3>{t('landing.events.babyShower.title')}</h3>
                <p>{t('landing.events.babyShower.description')}</p>
              </div>
            </div>
            <div className="landing-page__event">
              <div className="landing-page__event-icon">
                <FaUsers />
              </div>
              <div className="landing-page__event-content">
                <h3>{t('landing.events.family.title')}</h3>
                <p>{t('landing.events.family.description')}</p>
              </div>
            </div>
            <div className="landing-page__event">
              <div className="landing-page__event-icon">
                <FaBriefcase />
              </div>
              <div className="landing-page__event-content">
                <h3>{t('landing.events.corporate.title')}</h3>
                <p>{t('landing.events.corporate.description')}</p>
              </div>
            </div>
            <div className="landing-page__event">
              <div className="landing-page__event-icon">
                <FaSmile />
              </div>
              <div className="landing-page__event-content">
                <h3>{t('landing.events.friends.title')}</h3>
                <p>{t('landing.events.friends.description')}</p>
              </div>
            </div>
            <div className="landing-page__event">
              <div className="landing-page__event-icon">
                <FaBirthdayCake />
              </div>
              <div className="landing-page__event-content">
                <h3>{t('landing.events.kids.title')}</h3>
                <p>{t('landing.events.kids.description')}</p>
              </div>
            </div>
            <div className="landing-page__event">
              <div className="landing-page__event-icon">
                <FaBirthdayCake />
              </div>
              <div className="landing-page__event-content">
                <h3>{t('landing.events.others.title')}</h3>
                <p>{t('landing.events.others.description')}</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="landing-page__cta">
          <div className="landing-page__cta-decorative"></div>
          <div className="landing-page__cta-content">
            <div className="landing-page__cta-badge">
              <FaStar />
              <span>{t('landing.ctaSection.badge')}</span>
            </div>
            <h2>{t('landing.ctaSection.title')}</h2>
            <p>{t('landing.ctaSection.description')}</p>
            <button
              onClick={onStart}
              className="landing-page__cta-button landing-page__cta-button--primary"
            >
              {t('landing.ctaSection.button')}
              <FaArrowRight />
            </button>
          </div>
        </section>

        {/* Info Links */}
        <section className="landing-page__info">
          <Link to="/como-se-juega" className="landing-page__info-link">
            <FaGamepad />
            <span>{t('landing.info.howToPlay')}</span>
          </Link>
          <Link to="/que-es-la-loteria" className="landing-page__info-link">
            <FaBook />
            <span>{t('landing.info.whatIs')}</span>
          </Link>
        </section>
      </main>

      <footer className="landing-page__footer">
        <p>chorroybuenas.com.mx</p>
        <p>
          {t('landing.footer.tradition')} <FaHeart />
        </p>
      </footer>
    </div>
  );
};
