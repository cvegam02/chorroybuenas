import { useTranslation } from 'react-i18next';
import { PromoVideo } from './PromoVideo';
import './LandingHero.css';

interface LandingHeroProps {
  onStart: () => void;
}

export const LandingHero = ({ onStart }: LandingHeroProps) => {
  const { t } = useTranslation();

  return (
    <section className="landing-hero">
      <div className="landing-hero__inner">
        <div className="landing-hero__content">
          <span className="landing-hero__badge">{t('landing.hero.badge')}</span>
          <h1 className="landing-hero__title">
            {t('landing.hero.title')}
            <br />
            <span className="landing-hero__title-highlight">{t('landing.hero.titleHighlight')}</span>
          </h1>
          <p className="landing-hero__description">{t('landing.hero.description')}</p>
          <div className="landing-hero__actions">
            <button type="button" onClick={onStart} className="landing-cta-button landing-hero__cta">
              {t('landing.hero.cta')} <span aria-hidden="true">→</span>
            </button>
            <span className="landing-hero__note">{t('landing.hero.note')}</span>
          </div>
        </div>
        <div className="landing-hero__media">
          <PromoVideo name="hero-gratis" alt={t('landing.hero.videoAlt')} className="landing-hero__video" />
        </div>
      </div>
    </section>
  );
};
