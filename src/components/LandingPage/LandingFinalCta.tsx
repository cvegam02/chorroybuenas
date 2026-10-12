import { useTranslation } from 'react-i18next';
import './LandingFinalCta.css';

interface LandingFinalCtaProps {
  onStart: () => void;
}

export const LandingFinalCta = ({ onStart }: LandingFinalCtaProps) => {
  const { t } = useTranslation();

  return (
    <section className="landing-final-cta">
      <div className="landing-final-cta__box">
        <h2 className="landing-final-cta__title">{t('landing.ctaSection.title')}</h2>
        <p className="landing-final-cta__description">{t('landing.ctaSection.description')}</p>
        <button type="button" onClick={onStart} className="landing-cta-button">
          {t('landing.hero.cta')} <span aria-hidden="true">→</span>
        </button>
      </div>
    </section>
  );
};
