import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useWelcomeTokens } from '../../hooks/useWelcomeTokens';
import type { FaqItem } from '../../utils/faqJsonLd';
import { AuthChoice } from '../Auth/AuthChoice';
import { EmailAuthModal } from '../Auth/EmailAuthModal';
import { FaqSection } from '../Faq/FaqSection';
import { PromoVideo } from '../LandingPage/PromoVideo';
import { BenefitsCost } from './BenefitsCost';
import { BenefitsAccount, BenefitsBeforeAfter, BenefitsGallery, BenefitsHow } from './BenefitsSections';
import '../LandingPage/LandingPage.css';
import '../LandingPage/LandingShowcase.css';
import '../LandingPage/LandingFinalCta.css';
import './BenefitsPage.css';

const FAQ_IDS = ['needAi', 'badResult', 'pay', 'privacy', 'notAllowed'] as const;

/** P2 Beneficios (FEAT-33, US A2): qué se gana con una cuenta y cómo queda una foto con IA. */
const BenefitsPage = () => {
  const { t } = useTranslation();
  const { user, isLoading } = useAuth();
  const welcomeTokens = useWelcomeTokens();
  const [isSignUpOpen, setIsSignUpOpen] = useState(false);
  const isLoggedIn = !isLoading && !!user;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const faqItems: FaqItem[] = FAQ_IDS.map((id) => ({
    question: t(`landing.benefitsPage.faq.${id}.question`),
    answer: t(`landing.benefitsPage.faq.${id}.answer`),
    ...(id === 'privacy' && { linkLabel: t('landing.benefitsPage.faq.privacy.linkLabel'), linkTo: '/privacidad' }),
  }));

  return (
    <main className="landing-page benefits-page">
      <section className="benefits-hero">
        <div className="benefits-hero__inner">
          <div className="benefits-hero__content">
            {!isLoggedIn && welcomeTokens !== null && (
              <span className="benefits-hero__badge">{t('landing.benefitsPage.hero.badge', { count: welcomeTokens })}</span>
            )}
            <h1 className="benefits-hero__title">
              {t('landing.benefitsPage.hero.titleBefore')}{' '}
              <span className="benefits-hero__title-highlight">{t('landing.benefitsPage.hero.titleHighlight')}</span>{' '}
              {t('landing.benefitsPage.hero.titleAfter')}
            </h1>
            <p className="benefits-hero__description">{t('landing.benefitsPage.hero.description')}</p>
            {isLoggedIn ? (
              <div className="benefits-hero__actions">
                <Link to="/cards" className="landing-cta-button benefits-hero__link">
                  {t('landing.benefitsPage.hero.create')}
                </Link>
                <Link to="/comprar-tokens" className="benefits-hero__link benefits-hero__link--outline">
                  {t('landing.benefitsPage.hero.buyTokens')}
                </Link>
              </div>
            ) : (
              <AuthChoice tone="onPrimary" />
            )}
            <span className="benefits-hero__note">{t('landing.benefitsPage.hero.freeNote')}</span>
          </div>
          <div className="benefits-hero__media">
            <PromoVideo name="hero-cartas" alt={t('landing.benefitsPage.hero.videoAlt')} className="benefits-hero__video" />
          </div>
        </div>
      </section>

      <BenefitsBeforeAfter />
      <BenefitsHow welcomeTokens={welcomeTokens} />
      <BenefitsCost welcomeTokens={welcomeTokens} />
      <BenefitsGallery />
      <BenefitsAccount />
      <FaqSection title={t('landing.benefitsPage.faq.title')} items={faqItems} openFirst />

      <section className="landing-final-cta">
        <div className="landing-final-cta__box">
          {isLoggedIn ? (
            <>
              <h2 className="landing-final-cta__title">{t('landing.benefitsPage.cta.loggedTitle')}</h2>
              <p className="landing-final-cta__description">{t('landing.benefitsPage.cta.loggedDescription')}</p>
              <Link to="/comprar-tokens" className="landing-cta-button benefits-hero__link">
                {t('landing.benefitsPage.cta.loggedButton')}
              </Link>
            </>
          ) : (
            <>
              <h2 className="landing-final-cta__title">
                {welcomeTokens !== null
                  ? t('landing.benefitsPage.cta.title', { count: welcomeTokens })
                  : t('landing.benefitsPage.cta.titleNoGift')}
              </h2>
              <p className="landing-final-cta__description">
                {welcomeTokens !== null
                  ? t('landing.benefitsPage.cta.description', { count: welcomeTokens })
                  : t('landing.benefitsPage.cta.descriptionNoGift')}
              </p>
              <button type="button" className="landing-cta-button" onClick={() => setIsSignUpOpen(true)}>
                {t('landing.benefitsPage.cta.button')} <span aria-hidden="true">→</span>
              </button>
            </>
          )}
        </div>
      </section>

      <EmailAuthModal isOpen={isSignUpOpen} onClose={() => setIsSignUpOpen(false)} initialMode="signup" />
    </main>
  );
};

export default BenefitsPage;
