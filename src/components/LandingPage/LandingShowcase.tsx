import { useTranslation } from 'react-i18next';
import './LandingShowcase.css';

// Los nombres van impresos en cada carta de ejemplo, así que no se traducen.
const SAMPLE_CARDS = [
  'La Holandesita',
  'El Vaquero',
  'Los Abuelos',
  'La Payasita',
  'La Chata',
  'Los Hermanitos',
  'La del Sombrero',
  'La Consentida',
] as const;

const cardSrc = (index: number) => `/media/inicio/cartas/carta-${String(index + 1).padStart(2, '0')}.jpg`;

export const LandingShowcase = () => {
  const { t } = useTranslation();

  return (
    <section className="landing-section">
      <div className="landing-section__inner landing-showcase">
        <div className="landing-section__header">
          <h2 className="landing-section__title">{t('landing.showcase.title')}</h2>
          <p className="landing-section__subtitle">{t('landing.showcase.subtitle')}</p>
        </div>
        {/* La fila se desliza de lado: con tabIndex también se puede recorrer con el teclado. */}
        <ul className="landing-showcase__row" tabIndex={0} aria-label={t('landing.showcase.rowLabel')}>
          {SAMPLE_CARDS.map((name, index) => (
            <li key={name} className="landing-showcase__item">
              <img
                className="landing-showcase__card"
                src={cardSrc(index)}
                alt={t('landing.showcase.cardAlt', { name })}
                width={170}
                height={255}
                loading="lazy"
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};
