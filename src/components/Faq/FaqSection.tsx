import { Link } from 'react-router-dom';
import { faqJsonLd, type FaqItem } from '../../utils/faqJsonLd';
import '../LandingPage/LandingPage.css';
import '../LandingPage/LandingFaq.css';

interface FaqSectionProps {
  title: string;
  items: readonly FaqItem[];
  /** La primera pregunta llega abierta. */
  openFirst?: boolean;
}

// Dentro de <script> no puede aparecer «</script»: el «<» viaja escapado.
const toScriptText = (data: unknown) => JSON.stringify(data).replace(/</g, '\\u003c');

/**
 * Preguntas frecuentes con `<details>`, que Google sí lee, y sus datos `FAQPage`, que salen de los
 * mismos textos que se ven.
 */
export const FaqSection = ({ title, items, openFirst = false }: FaqSectionProps) => (
  <section className="landing-faq">
    <h2 className="landing-section__title landing-faq__title">{title}</h2>
    {items.map((item, index) => (
      <details key={item.question} className="landing-faq__item" open={openFirst && index === 0}>
        <summary className="landing-faq__question">{item.question}</summary>
        <p className="landing-faq__answer">
          {item.answer}
          {item.linkLabel && item.linkTo && (
            <>
              {' '}
              <Link to={item.linkTo}>{item.linkLabel}</Link>.
            </>
          )}
        </p>
      </details>
    ))}
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: toScriptText(faqJsonLd(items)) }} />
  </section>
);
