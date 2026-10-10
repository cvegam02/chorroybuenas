import { useTranslation } from 'react-i18next';
import { FaCloud, FaCoins, FaMobileAlt } from 'react-icons/fa';

const MEDIA = '/media/beneficios';

// Los nombres van impresos en las cartas, así que no se traducen.
const PAIRS = [
  { id: 'chata', name: 'La Chata', before: 'antes-la-chata.jpg', after: 'ia-la-chata.jpg' },
  { id: 'vaquero', name: 'El Vaquero', before: 'antes-el-vaquero.jpg', after: 'galeria/carta-02.jpg' },
  { id: 'consentida', name: 'La Consentida', before: 'antes-la-consentida.jpg', after: 'galeria/carta-03.jpg' },
  { id: 'payasita', name: 'La Payasita', before: 'antes-la-payasita.jpg', after: 'galeria/carta-06.jpg' },
] as const;

const GALLERY = ['La Jefita', 'El Vaquero', 'La Consentida', 'El Michi', 'Los Abuelos', 'La Payasita'] as const;

const STEPS = ['step1', 'step2', 'step3'] as const;

const ACCOUNT_BENEFITS = [
  { id: 'saved', Icon: FaCloud, tone: 'orange' },
  { id: 'devices', Icon: FaMobileAlt, tone: 'teal' },
  { id: 'tokens', Icon: FaCoins, tone: 'yellow' },
] as const;

export const BenefitsBeforeAfter = () => {
  const { t } = useTranslation();
  return (
    <section className="landing-section">
      <div className="landing-section__inner benefits-pairs">
        <div className="landing-section__header">
          <h2 className="landing-section__title">{t('landing.benefitsPage.beforeAfter.title')}</h2>
          <p className="landing-section__subtitle">{t('landing.benefitsPage.beforeAfter.subtitle')}</p>
        </div>
        <ul className="benefits-pairs__list">
          {PAIRS.map(({ id, name, before, after }) => (
            <li key={id} className="benefits-pairs__pair">
              <figure className="benefits-pairs__side">
                <img
                  className="benefits-pairs__image benefits-pairs__image--before"
                  src={`${MEDIA}/${before}`}
                  alt={t(`landing.benefitsPage.beforeAfter.${id}`)}
                  width={300}
                  height={400}
                  loading="lazy"
                />
                <figcaption className="benefits-pairs__tag benefits-pairs__tag--before">
                  {t('landing.benefitsPage.beforeAfter.before')}
                </figcaption>
              </figure>
              <figure className="benefits-pairs__side">
                <img
                  className="benefits-pairs__image benefits-pairs__image--after"
                  src={`${MEDIA}/${after}`}
                  alt={t('landing.benefitsPage.gallery.cardAlt', { name })}
                  width={300}
                  height={450}
                  loading="lazy"
                />
                <figcaption className="benefits-pairs__tag benefits-pairs__tag--after">
                  {t('landing.benefitsPage.beforeAfter.after')}
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

/** `welcomeTokens`: tokens de regalo de una cuenta nueva; sin ellos el paso 1 no promete regalo. */
export const BenefitsHow = ({ welcomeTokens }: { welcomeTokens: number | null }) => {
  const { t } = useTranslation();
  return (
    <section className="landing-section landing-section--band">
      <div className="landing-section__inner benefits-how">
        <h2 className="landing-section__title benefits-how__title">{t('landing.benefitsPage.how.title')}</h2>
        <ol className="benefits-how__list">
          {STEPS.map((id, index) => (
            <li key={id} className="benefits-how__step">
              <span className="benefits-how__number" aria-hidden="true">
                {index + 1}
              </span>
              <h3 className="benefits-how__step-title">{t(`landing.benefitsPage.how.${id}.title`)}</h3>
              <p className="benefits-how__description">
                {t(`landing.benefitsPage.how.${id}.description`)}
                {id === 'step1' && welcomeTokens !== null && (
                  <> {t('landing.benefitsPage.how.step1.gift', { count: welcomeTokens })}</>
                )}
              </p>
            </li>
          ))}
        </ol>
        <p className="benefits-how__note">{t('landing.benefitsPage.how.note')}</p>
      </div>
    </section>
  );
};

export const BenefitsGallery = () => {
  const { t } = useTranslation();
  return (
    <section className="landing-section landing-section--band">
      <div className="landing-section__inner landing-showcase">
        <div className="landing-section__header">
          <h2 className="landing-section__title">{t('landing.benefitsPage.gallery.title')}</h2>
          <p className="landing-section__subtitle">{t('landing.benefitsPage.gallery.subtitle')}</p>
        </div>
        <ul
          className="landing-showcase__row benefits-gallery__row"
          tabIndex={0}
          aria-label={t('landing.benefitsPage.gallery.rowLabel')}
        >
          {GALLERY.map((name, index) => (
            <li key={name} className="landing-showcase__item">
              <img
                className="landing-showcase__card"
                src={`${MEDIA}/galeria/carta-${String(index + 1).padStart(2, '0')}.jpg`}
                alt={t('landing.benefitsPage.gallery.cardAlt', { name })}
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

export const BenefitsAccount = () => {
  const { t } = useTranslation();
  return (
    <section className="landing-section">
      <div className="landing-section__inner benefits-account">
        <h2 className="landing-section__title benefits-account__title">{t('landing.benefitsPage.account.title')}</h2>
        <ul className="benefits-account__list">
          {ACCOUNT_BENEFITS.map(({ id, Icon, tone }) => (
            <li key={id} className="benefits-account__item">
              <span className={`benefits-account__icon benefits-account__icon--${tone}`}>
                <Icon aria-hidden="true" />
              </span>
              <div>
                <h3 className="benefits-account__item-title">{t(`landing.benefitsPage.account.${id}.title`)}</h3>
                <p className="benefits-account__description">{t(`landing.benefitsPage.account.${id}.description`)}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};
