import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './HowToPlay.css';
import comosejuegaImage from '../../img/comosejuega.png';

export const HowToPlay = () => {
  const { t } = useTranslation();

  useEffect(() => {
    document.title = t('howToPlay.title');
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', t('howToPlay.metaDescription'));
    }
  }, [t]);

  return (
    <div className="how-to-play">
      <header className="how-to-play__header">
        <div className="how-to-play__container">
          <Link to="/" className="how-to-play__back">
            <span role="img" aria-label="back">←</span> {t('common.back')}
          </Link>
          <div className="how-to-play__header-image">
            <img src={comosejuegaImage} alt={t('howToPlay.header.title')} />
          </div>
          <h1 className="how-to-play__title">{t('howToPlay.header.title')}</h1>
          <p className="how-to-play__subtitle">{t('howToPlay.header.subtitle')}</p>
        </div>
      </header>

      <main className="how-to-play__content">
        <div className="how-to-play__container">
          <div className="how-to-play__instructions">
            <section className="how-to-play__instruction-item">
              <div className="how-to-play__instruction-number">1</div>
              <div className="how-to-play__instruction-content">
                <h3>{t('howToPlay.steps.step1.title')}</h3>
                <p>{t('howToPlay.steps.step1.text')}</p>
              </div>
            </section>

            <section className="how-to-play__instruction-item">
              <div className="how-to-play__instruction-number">2</div>
              <div className="how-to-play__instruction-content">
                <h3>{t('howToPlay.steps.step2.title')}</h3>
                <p>{t('howToPlay.steps.step2.text')}</p>
              </div>
            </section>

            <section className="how-to-play__instruction-item">
              <div className="how-to-play__instruction-number">3</div>
              <div className="how-to-play__instruction-content">
                <h3>{t('howToPlay.steps.step3.title')}</h3>
                <p>{t('howToPlay.steps.step3.text')}</p>
              </div>
            </section>

            <section className="how-to-play__instruction-item">
              <div className="how-to-play__instruction-number">4</div>
              <div className="how-to-play__instruction-content">
                <h3>{t('howToPlay.steps.step4.title')}</h3>
                <p>{t('howToPlay.steps.step4.text')}</p>
              </div>
            </section>
          </div>

          <div className="how-to-play__traditional-rules">
            <section className="how-to-play__section">
              <h2 className="how-to-play__section-title">{t('howToPlay.steps.betting.title')}</h2>
              <p className="how-to-play__text">{t('howToPlay.steps.betting.text')}</p>
            </section>

            <section className="how-to-play__section">
              <h2 className="how-to-play__section-title">{t('howToPlay.steps.patterns.title')}</h2>
              <div className="how-to-play__list">
                <div className="how-to-play__pattern-example">
                  <div className="how-to-play__mini-grid">
                    {Array.from({ length: 16 }).map((_, i) => (
                      <div key={i} className="how-to-play__mini-cell how-to-play__mini-cell--active" />
                    ))}
                  </div>
                  <div className="how-to-play__pattern-content">
                    <strong>{t('howToPlay.steps.patterns.fullBoard').split(':')[0]}:</strong>
                    <p>{t('howToPlay.steps.patterns.fullBoard').split(':')[1]}</p>
                  </div>
                </div>

                <div className="how-to-play__pattern-example">
                  <div className="how-to-play__mini-grid">
                    {Array.from({ length: 16 }).map((_, i) => {
                      const row = Math.floor(i / 4);
                      const isActive = row === 1; // Example: 2nd row horizontal
                      return (
                        <div key={i} className={`how-to-play__mini-cell ${isActive ? 'how-to-play__mini-cell--active' : ''}`} />
                      );
                    })}
                  </div>
                  <div className="how-to-play__pattern-content">
                    <strong>{t('howToPlay.steps.patterns.line').split(':')[0]}:</strong>
                    <p>{t('howToPlay.steps.patterns.line').split(':')[1]}</p>
                  </div>
                </div>

                <div className="how-to-play__pattern-example">
                  <div className="how-to-play__mini-grid">
                    {Array.from({ length: 16 }).map((_, i) => {
                      const center = [5, 6, 9, 10];
                      const isActive = center.includes(i);
                      return (
                        <div key={i} className={`how-to-play__mini-cell ${isActive ? 'how-to-play__mini-cell--active' : ''}`} />
                      );
                    })}
                  </div>
                  <div className="how-to-play__pattern-content">
                    <strong>{t('howToPlay.steps.patterns.center').split(':')[0]}:</strong>
                    <p>{t('howToPlay.steps.patterns.center').split(':')[1]}</p>
                  </div>
                </div>

                <div className="how-to-play__pattern-example">
                  <div className="how-to-play__mini-grid">
                    {Array.from({ length: 16 }).map((_, i) => {
                      const corners = [0, 3, 12, 15];
                      const isActive = corners.includes(i);
                      return (
                        <div key={i} className={`how-to-play__mini-cell ${isActive ? 'how-to-play__mini-cell--active' : ''}`} />
                      );
                    })}
                  </div>
                  <div className="how-to-play__pattern-content">
                    <strong>{t('howToPlay.steps.patterns.corners').split(':')[0]}:</strong>
                    <p>{t('howToPlay.steps.patterns.corners').split(':')[1]}</p>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <section className="how-to-play__cta">
            <h2 className="how-to-play__cta-title">{t('howToPlay.cta.title')}</h2>
            <Link to="/cards" className="how-to-play__cta-button">
              {t('howToPlay.cta.button')}
            </Link>
          </section>
        </div>
      </main>
    </div>
  );
};
