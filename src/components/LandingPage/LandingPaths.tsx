import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { LandingVideo } from './LandingVideo';
import type { LandingPrices } from './useLandingPrices';
import './LandingPaths.css';

const THEMED_IMAGE = '/media/inicio/tematica-halloween.jpg';

/** Las otras dos formas de tener una lotería: transformar las fotos con IA o comprar una temática. */
export const LandingPaths = ({ aiPrice, themedPrice }: LandingPrices) => {
  const { t } = useTranslation();
  // En celular la tarjeta de IA lleva imagen fija, para no poner dos videos seguidos.
  const isPhone = useMediaQuery('(max-width: 768px)');

  return (
    <section className="landing-paths" aria-labelledby="landing-paths-title">
      <h2 id="landing-paths-title" className="landing-paths__title">
        {t('landing.paths.title')}
      </h2>

      <Link to="/beneficios" className="landing-paths__card landing-paths__card--ai">
        <LandingVideo
          name="hero-cartas"
          alt={t('landing.paths.ai.mediaAlt')}
          className="landing-paths__media"
          still={isPhone}
        />
        <div className="landing-paths__body">
          <h3 className="landing-paths__card-title">{t('landing.paths.ai.title')}</h3>
          <p className="landing-paths__description">{t('landing.paths.ai.description')}</p>
          {aiPrice && <span className="landing-paths__price">{t('landing.paths.ai.price', { price: aiPrice })}</span>}
          <span className="landing-paths__cta">
            {t('landing.paths.ai.cta')} <span aria-hidden="true">→</span>
          </span>
        </div>
      </Link>

      <Link to="/tematicas" className="landing-paths__card landing-paths__card--themed">
        <img className="landing-paths__media" src={THEMED_IMAGE} alt={t('landing.paths.themed.imageAlt')} />
        <div className="landing-paths__body">
          <h3 className="landing-paths__card-title">{t('landing.paths.themed.title')}</h3>
          <p className="landing-paths__description">{t('landing.paths.themed.description')}</p>
          {themedPrice && (
            <span className="landing-paths__price">{t('landing.paths.themed.price', { price: themedPrice })}</span>
          )}
          <span className="landing-paths__cta">
            {t('landing.paths.themed.cta')} <span aria-hidden="true">→</span>
          </span>
        </div>
      </Link>
    </section>
  );
};
