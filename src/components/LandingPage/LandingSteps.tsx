import { useTranslation } from 'react-i18next';
import './LandingSteps.css';

const STEPS = [
  { id: 'step1', image: '/media/inicio/paso-1-fotos.png' },
  { id: 'step2', image: '/media/inicio/paso-2-tablero.jpg' },
  { id: 'step3', image: '/media/inicio/paso-3-baraja.jpg' },
] as const;

export const LandingSteps = () => {
  const { t } = useTranslation();

  return (
    <section className="landing-section landing-section--band">
      <div className="landing-section__inner landing-steps">
        <div className="landing-section__header">
          <h2 className="landing-section__title">{t('landing.steps.title')}</h2>
          <p className="landing-section__subtitle">{t('landing.steps.subtitle')}</p>
        </div>
        <ol className="landing-steps__list">
          {STEPS.map(({ id, image }, index) => (
            <li key={id} className="landing-steps__step">
              <div className="landing-steps__figure">
                <img
                  className={`landing-steps__image landing-steps__image--${id}`}
                  src={image}
                  alt={t(`landing.steps.${id}.imageAlt`)}
                  loading="lazy"
                />
              </div>
              <div className="landing-steps__heading">
                <span className="landing-steps__number" aria-hidden="true">
                  {index + 1}
                </span>
                <h3 className="landing-steps__title">{t(`landing.steps.${id}.title`)}</h3>
              </div>
              <p className="landing-steps__description">{t(`landing.steps.${id}.description`)}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
};
