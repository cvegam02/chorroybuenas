import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FaGoogle, FaMagic, FaShieldAlt } from 'react-icons/fa';
import { ABOUT_SECTION_ID } from './anchors';
import './LandingAbout.css';

const TOPICS = [
  { id: 'ai', Icon: FaMagic },
  { id: 'google', Icon: FaGoogle },
  { id: 'content', Icon: FaShieldAlt },
] as const;

/**
 * Qué es el sitio, para qué usa la IA y Google, y qué contenido no se permite. Google la exige para
 * verificar el inicio de sesión (FEAT-22): tiene que leerse completa sin hacer clic.
 */
export const LandingAbout = () => {
  const { t } = useTranslation();

  return (
    <section id={ABOUT_SECTION_ID} className="landing-about">
      <div className="landing-about__box">
        <div className="landing-about__intro">
          <h2 className="landing-about__title">{t('landing.about.title')}</h2>
          <p className="landing-about__description">{t('landing.about.description')}</p>
        </div>
        <ul className="landing-about__list">
          {TOPICS.map(({ id, Icon }) => (
            <li key={id} className="landing-about__item">
              <Icon className="landing-about__icon" aria-hidden="true" />
              <h3 className="landing-about__item-title">{t(`landing.about.${id}.title`)}</h3>
              <p className="landing-about__item-description">{t(`landing.about.${id}.description`)}</p>
            </li>
          ))}
        </ul>
        <p className="landing-about__privacy">
          {t('landing.about.privacyPrefix')} <Link to="/privacidad">{t('landing.about.privacyLink')}</Link>.
        </p>
      </div>
    </section>
  );
};
