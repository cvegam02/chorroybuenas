import { useTranslation } from 'react-i18next';
import { aiCostAnswerKey } from '../../utils/landingPrices';
import './LandingFaq.css';

interface LandingFaqProps {
  /** Precio de un token, ya escrito; sin él la respuesta del costo sale sin cifra. */
  aiPrice: string | null;
}

export const LandingFaq = ({ aiPrice }: LandingFaqProps) => {
  const { t } = useTranslation();

  const questions = [
    { id: 'free', answer: t('landing.faq.free.answer') },
    { id: 'aiCost', answer: t(aiCostAnswerKey(aiPrice), { price: aiPrice }) },
    { id: 'photos', answer: t('landing.faq.photos.answer') },
  ];

  return (
    <section className="landing-faq">
      <h2 className="landing-section__title landing-faq__title">{t('landing.faq.title')}</h2>
      {questions.map(({ id, answer }, index) => (
        <details key={id} className="landing-faq__item" open={index === 0}>
          <summary className="landing-faq__question">{t(`landing.faq.${id}.question`)}</summary>
          <p className="landing-faq__answer">{answer}</p>
        </details>
      ))}
    </section>
  );
};
