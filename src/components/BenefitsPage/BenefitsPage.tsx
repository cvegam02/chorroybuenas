import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { FaCloud, FaSync, FaImage, FaCoins, FaEnvelope } from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import { EmailAuthModal } from '../Auth/EmailAuthModal';
import './BenefitsPage.css';

const BenefitsPage: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { user, isLoading } = useAuth();
    const [isEmailModalOpen, setIsEmailModalOpen] = React.useState(false);

    useEffect(() => {
        window.scrollTo(0, 0);
        document.title = `${t('landing.benefitsPage.title')} | Lotería Personalizada`;
    }, [t]);

    if (user && !isLoading) {
        // If already logged in, no need to show this page as a "why register" pitch
        // But we might want to show it as a "features" page. For now, let's keep it simple.
    }

    return (
        <div className="benefits-page">
            <header className="benefits-page__header">
                <div className="benefits-page__container">
                    <h1 className="benefits-page__title">{t('landing.benefitsPage.title')}</h1>
                    <p className="benefits-page__subtitle">{t('landing.benefitsPage.subtitle')}</p>
                </div>
            </header>

            <main className="benefits-page__main">
                <div className="benefits-page__container">
                    {/* Antes / Después - Transformación con IA (video izquierda, texto derecha) */}
                    <section className="benefits-page__before-after">
                        <div className="benefits-page__before-after-inner">
                            <div className="benefits-page__comparison">
                                <div className="benefits-page__comparison-image-wrap">
                                    <video
                                        src="/videopromo.mp4"
                                        className="benefits-page__comparison-video"
                                        autoPlay
                                        muted
                                        loop
                                        playsInline
                                        aria-label={t('landing.benefitsPage.beforeAfter.imageAlt')}
                                    />
                                </div>
                            </div>
                            <div className="benefits-page__ai-content benefits-page__ai-content--right">
                                <h2>{t('landing.benefitsPage.beforeAfter.title')}</h2>
                                <p>{t('landing.benefitsPage.beforeAfter.description')}</p>
                            </div>
                        </div>
                    </section>

                    <section className="benefits-page__section benefits-page__section--benefits">
                        <h2 className="benefits-page__section-title">{t('landing.benefitsPage.moreBenefitsTitle')}</h2>
                        <div className="benefits-page__grid">
                            {/* AI Transform - Principal */}
                            <div className="benefits-page__card benefits-page__card--featured">
                                <div className="benefits-page__icon benefits-page__icon--ai">
                                    <FaImage />
                                </div>
                                <div className="benefits-page__card-content">
                                    <h3>{t('landing.benefitsPage.aiTransform.title')}</h3>
                                    <p>{t('landing.benefitsPage.aiTransform.description')}</p>
                                </div>
                            </div>

                            {/* Cloud Storage */}
                            <div className="benefits-page__card">
                                <div className="benefits-page__icon benefits-page__icon--cloud">
                                    <FaCloud />
                                </div>
                                <div className="benefits-page__card-content">
                                    <h3>{t('landing.benefitsPage.cloud.title')}</h3>
                                    <p>{t('landing.benefitsPage.cloud.description')}</p>
                                </div>
                            </div>

                            {/* Sync */}
                            <div className="benefits-page__card">
                                <div className="benefits-page__icon benefits-page__icon--sync">
                                    <FaSync />
                                </div>
                                <div className="benefits-page__card-content">
                                    <h3>{t('landing.benefitsPage.sync.title')}</h3>
                                    <p>{t('landing.benefitsPage.sync.description')}</p>
                                </div>
                            </div>

                            {/* AI Credits */}
                            <div className="benefits-page__card">
                                <div className="benefits-page__icon benefits-page__icon--credits">
                                    <FaCoins />
                                </div>
                                <div className="benefits-page__card-content">
                                    <h3>{t('landing.benefitsPage.credits.title')}</h3>
                                    <p>{t('landing.benefitsPage.credits.description')}</p>
                                </div>
                            </div>
                        </div>
                    </section>

                    {!user && !isLoading && (
                        <section className="benefits-page__cta-section benefits-page__cta-section--bottom">
                            <div className="benefits-page__cta-card">
                                <h2>{t('landing.benefitsPage.cta')}</h2>
                                <div className="benefits-page__auth-options">
                                    <button
                                        onClick={() => setIsEmailModalOpen(true)}
                                        className="benefits-page__email-btn"
                                    >
                                        <FaEnvelope />
                                        {t('common.auth.titleSignUp')}
                                    </button>
                                </div>
                                <button
                                    onClick={() => navigate('/')}
                                    className="benefits-page__back-btn"
                                >
                                    {t('landing.benefitsPage.backToHome')}
                                </button>
                            </div>
                        </section>
                    )}
                </div>
            </main>
            <EmailAuthModal
                isOpen={isEmailModalOpen}
                onClose={() => setIsEmailModalOpen(false)}
                initialMode="signup"
            />
        </div>
    );
};

export default BenefitsPage;
