import { useTranslation } from 'react-i18next';
import './LandingFeatures.css';

const FEATURES = ['customizable', 'editor', 'kids', 'pdf'] as const;

export const LandingFeatures = () => {
  const { t } = useTranslation();

  return (
    <section className="landing-section">
      <div className="landing-section__inner landing-features">
        <img
          className="landing-features__image"
          src="/media/inicio/mesa-loteria.jpg"
          alt={t('landing.features.imageAlt')}
          loading="lazy"
        />
        <div className="landing-features__content">
          <h2 className="landing-section__title">{t('landing.features.title')}</h2>
          <ul className="landing-features__list">
            {FEATURES.map((id) => (
              <li key={id} className="landing-features__item">
                <h3 className="landing-features__item-title">{t(`landing.features.${id}.title`)}</h3>
                <p className="landing-features__item-description">{t(`landing.features.${id}.description`)}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
};
