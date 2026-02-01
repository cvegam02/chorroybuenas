import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './AboutLoteria.css';
import queesImage from '../../img/quees.jpg';

export const AboutLoteria = () => {
  const { t } = useTranslation();

  useEffect(() => {
    document.title = t('about.title');
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', t('about.metaDescription'));
    }
  }, [t]);

  return (
    <div className="about-loteria">
      <header className="about-loteria__header">
        <div className="about-loteria__container">
          <Link to="/" className="about-loteria__back">
            <span role="img" aria-label="back">←</span> {t('common.back')}
          </Link>
          <div className="about-loteria__header-image">
            <img src={queesImage} alt={t('about.header.title')} />
          </div>
          <h1 className="about-loteria__title">{t('about.header.title')}</h1>
          <p className="about-loteria__subtitle">{t('about.header.subtitle')}</p>
        </div>
      </header>

      <main className="about-loteria__content">
        <div className="about-loteria__container">
          <section className="about-loteria__section">
            <h2 className="about-loteria__section-title">{t('about.history.title')}</h2>
            <p className="about-loteria__text">{t('about.history.text')}</p>
          </section>

          <section className="about-loteria__section">
            <h2 className="about-loteria__section-title">{t('about.culture.title')}</h2>
            <p className="about-loteria__text">{t('about.culture.text')}</p>
          </section>

          <section className="about-loteria__section about-loteria__section--highlight">
            <h2 className="about-loteria__section-title">{t('about.traditionalGame.title')}</h2>
            <p className="about-loteria__text">{t('about.traditionalGame.text')}</p>
          </section>

          <section className="about-loteria__section">
            <h2 className="about-loteria__section-title">{t('about.customLoteria.title')}</h2>
            <p className="about-loteria__text">{t('about.customLoteria.text')}</p>
          </section>

          <section className="about-loteria__cta">
            <h2 className="about-loteria__cta-title">{t('about.cta.title')}</h2>
            <p className="about-loteria__cta-text">{t('about.cta.text')}</p>
            <div className="about-loteria__actions">
              <Link to="/cards" className="about-loteria__cta-button about-loteria__cta-button--primary">
                {t('about.cta.create')}
              </Link>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};
