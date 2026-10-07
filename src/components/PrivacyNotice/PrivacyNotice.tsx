import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  PRIVACY_INTRO,
  PRIVACY_LAST_UPDATED,
  PRIVACY_SECTIONS,
} from './privacyNoticeContent';
import './PrivacyNotice.css';

const PAGE_TITLE = 'Aviso de privacidad';

export const PrivacyNotice = () => {
  const { t } = useTranslation();

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = `${PAGE_TITLE} - chorroybuenas.com.mx`;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', PRIVACY_INTRO);
    }
  }, []);

  return (
    <div className="privacy-notice" lang="es">
      <div className="privacy-notice__container">
        <header className="privacy-notice__header">
          <Link to="/" className="privacy-notice__back">
            <span aria-hidden="true">←</span> {t('common.back')}
          </Link>
          <h1 className="privacy-notice__title">{PAGE_TITLE}</h1>
          <p className="privacy-notice__updated">Última actualización: {PRIVACY_LAST_UPDATED}</p>
          <p className="privacy-notice__text">{PRIVACY_INTRO}</p>
        </header>

        <main className="privacy-notice__sections">
          {PRIVACY_SECTIONS.map((section) => (
            <section key={section.title} className="privacy-notice__section">
              <h2 className="privacy-notice__section-title">{section.title}</h2>
              {section.paragraphs?.map((paragraph) => (
                <p key={paragraph} className="privacy-notice__text">{paragraph}</p>
              ))}
              {section.items && (
                <ul className="privacy-notice__list">
                  {section.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
              {section.closing && <p className="privacy-notice__text">{section.closing}</p>}
            </section>
          ))}
        </main>
      </div>
    </div>
  );
};
