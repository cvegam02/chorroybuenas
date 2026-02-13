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
                    {!user && !isLoading && (
                        <section className="benefits-page__cta-section benefits-page__cta-section--top">
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

                    <section className="benefits-page__section">
                        <div className="benefits-page__grid">
                            {/* Cloud Storage */}
                            <div className="benefits-page__card">
                                <div className="benefits-page__icon benefits-page__icon--cloud">
                                    <FaCloud />
                                </div>
                                <h3>{t('landing.benefitsPage.cloud.title')}</h3>
                                <p>{t('landing.benefitsPage.cloud.description')}</p>
                            </div>

                            {/* Sync */}
                            <div className="benefits-page__card">
                                <div className="benefits-page__icon benefits-page__icon--sync">
                                    <FaSync />
                                </div>
                                <h3>{t('landing.benefitsPage.sync.title')}</h3>
                                <p>{t('landing.benefitsPage.sync.description')}</p>
                            </div>

                            {/* AI Credits */}
                            <div className="benefits-page__card">
                                <div className="benefits-page__icon benefits-page__icon--credits">
                                    <FaCoins />
                                </div>
                                <h3>{t('landing.benefitsPage.credits.title')}</h3>
                                <p>{t('landing.benefitsPage.credits.description')}</p>
                            </div>
                        </div>
                    </section>

                    {/* AI Styles Showcase */}
                    <section className="benefits-page__ai-showcase">
                        <div className="benefits-page__ai-content">
                            <h2>{t('landing.benefitsPage.aiStyles.title')}</h2>
                            <p>{t('landing.benefitsPage.aiStyles.description')}</p>
                        </div>

                        <div className="benefits-page__showcase-grid">
                            {/* Traditional Style */}
                            <div className="benefits-page__showcase-item">
                                <div className="benefits-page__showcase-label">Tradicional</div>
                                <div className="benefits-page__showcase-image-container">
                                    <img
                                        src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg"
                                        alt="Traditional Style"
                                        className="benefits-page__showcase-placeholder"
                                        style={{ opacity: 0.1, filter: 'grayscale(1)' }}
                                    />
                                    <div className="benefits-page__style-preview benefits-page__style-preview--traditional">
                                        <FaImage />
                                    </div>
                                </div>
                            </div>

                            {/* Simpsons Style */}
                            <div className="benefits-page__showcase-item">
                                <div className="benefits-page__showcase-label">Simpsons</div>
                                <div className="benefits-page__showcase-image-container">
                                    <div className="benefits-page__style-preview benefits-page__style-preview--simpsons">
                                        <FaImage />
                                    </div>
                                </div>
                            </div>

                            {/* Ghibli Style */}
                            <div className="benefits-page__showcase-item">
                                <div className="benefits-page__showcase-label">Ghibli</div>
                                <div className="benefits-page__showcase-image-container">
                                    <div className="benefits-page__style-preview benefits-page__style-preview--ghibli">
                                        <FaImage />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
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
