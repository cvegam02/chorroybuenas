import { useTranslation } from 'react-i18next';
import { OccasionIcon, type OccasionId } from './occasionIcons';
import '../../fonts/arvoCarta.css';
import './LandingOccasions.css';

const OCCASIONS: readonly { id: OccasionId; tone: string }[] = [
  { id: 'babyShower', tone: 'pink' },
  { id: 'family', tone: 'teal' },
  { id: 'office', tone: 'yellow' },
  { id: 'friends', tone: 'orange' },
  { id: 'kids', tone: 'blue' },
  { id: 'party', tone: 'lilac' },
];

/** Las ocasiones, dibujadas como cartas de lotería (excepción a FEAT-29, decisión 9: FEAT-32, decisión 4). */
export const LandingOccasions = () => {
  const { t } = useTranslation();

  return (
    <section className="landing-section landing-section--band">
      <div className="landing-section__inner landing-occasions">
        <div className="landing-section__header">
          <h2 className="landing-section__title">{t('landing.occasions.title')}</h2>
          <p className="landing-section__subtitle">{t('landing.occasions.subtitle')}</p>
        </div>
        <ul className="landing-occasions__list">
          {OCCASIONS.map(({ id, tone }, index) => (
            <li key={id} className="landing-occasions__item">
              <div className="landing-occasions__card">
                <div className={`landing-occasions__face landing-occasions__face--${tone}`}>
                  <span className="landing-occasions__number" aria-hidden="true">
                    {index + 1}
                  </span>
                  <OccasionIcon id={id} className="landing-occasions__icon" />
                  <h3 className="landing-occasions__name">{t(`landing.occasions.${id}.name`)}</h3>
                </div>
              </div>
              <p className="landing-occasions__description">{t(`landing.occasions.${id}.description`)}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};
