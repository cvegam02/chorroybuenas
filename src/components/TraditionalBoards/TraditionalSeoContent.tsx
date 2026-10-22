import { useTranslation } from 'react-i18next';
import type { FaqItem } from '../../utils/faqJsonLd';
import { FaqSection } from '../Faq/FaqSection';
import '../LandingPage/LandingPage.css';
import '../LandingPage/LandingSteps.css';

const STEP_IDS = ['size', 'cards', 'print'] as const;
const FAQ_IDS = ['free', 'howMany', 'size', 'account', 'deck', 'why'] as const;

/**
 * Texto de P8 debajo de las herramientas (FEAT-53): cómo se crean los tableros, para qué sirven y preguntas
 * frecuentes con sus datos `FAQPage`. Es lo que lee Google para mostrar la página a quien busca crear o generar
 * tableros de lotería; va abajo para no estorbar a quien viene a armar.
 */
export const TraditionalSeoContent = () => {
  const { t } = useTranslation();
  const faqItems: FaqItem[] = FAQ_IDS.map((id) => ({
    question: t(`traditional.seo.faq.${id}.question`),
    answer: t(`traditional.seo.faq.${id}.answer`),
  }));

  return (
    <>
      <section className="landing-section landing-section--band">
        <div className="landing-section__inner landing-steps">
          <div className="landing-section__header">
            <h2 className="landing-section__title">{t('traditional.seo.steps.title')}</h2>
          </div>
          <ol className="landing-steps__list">
            {STEP_IDS.map((id, index) => (
              <li key={id} className="landing-steps__step">
                <div className="landing-steps__heading">
                  <span className="landing-steps__number" aria-hidden="true">
                    {index + 1}
                  </span>
                  <h3 className="landing-steps__title">{t(`traditional.seo.steps.${id}.title`)}</h3>
                </div>
                <p className="landing-steps__description">{t(`traditional.seo.steps.${id}.description`)}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="landing-section">
        <div className="landing-section__inner">
          <div className="landing-section__header">
            <h2 className="landing-section__title">{t('traditional.seo.about.title')}</h2>
            <p className="landing-section__subtitle">{t('traditional.seo.about.text')}</p>
          </div>
        </div>
      </section>

      <FaqSection title={t('traditional.seo.faq.title')} items={faqItems} />
    </>
  );
};
