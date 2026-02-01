import { FaEnvelope, FaPaypal } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import './Footer.css';

export const Footer = () => {
    const { t } = useTranslation();
    const currentYear = new Date().getFullYear();

    return (
        <footer className="footer--compact">
            <div className="container footer__container">
                <div className="footer__main">
                    <div className="footer__info">
                        <h3 className="footer__logo">{t('landing.hero.title')} {t('landing.hero.titleHighlight')}</h3>
                        <p className="footer__creator">
                            {t('footer.creator')} <strong>Carlos Vega</strong>
                        </p>
                    </div>

                    <div className="footer__dev-offer">
                        <p>{t('footer.devOffer')} <a href="mailto:carlos.tests01@gmail.com" className="footer__email-link">{t('footer.letTalk')}</a></p>
                        <div className="footer__actions">
                            <div className="footer__contact-item">
                                <FaEnvelope className="footer__icon" />
                                <span>carlos.tests01@gmail.com</span>
                            </div>
                            <a href="https://paypal.me/cavegam" target="_blank" rel="noopener noreferrer" className="footer__paypal-link">
                                <FaPaypal />
                                <span>{t('footer.support')}</span>
                            </a>
                        </div>
                    </div>
                </div>

                <div className="footer__bottom">
                    <p className="footer__copyright">
                        &copy; {currentYear} Lotería Personalizada
                    </p>
                    <p className="footer__slogan">{t('footer.slogan')}</p>
                </div>
            </div>
        </footer>
    );
};
