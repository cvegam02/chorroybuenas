import { FaEnvelope, FaHeart, FaPaypal } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ABOUT_SECTION_ID } from '../LandingPage/anchors';
import './Footer.css';

const CONTACT_EMAIL = 'carlos.tests01@gmail.com';
const PAYPAL_URL = 'https://paypal.me/cavegam';

/** Redes del sitio. Un enlace solo se muestra cuando tiene su URL (FEAT-32, decisión 9). */
const SOCIAL_LINKS: readonly { label: string; url: string }[] = [
    { label: 'Instagram', url: '' },
    { label: 'TikTok', url: '' },
];

export const Footer = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const currentYear = new Date().getFullYear();
    const socialLinks = SOCIAL_LINKS.filter(({ url }) => url !== '');

    return (
        <footer className="footer">
            <div className="footer__inner footer__main">
                <div className="footer__brand">
                    <strong className="footer__name">chorroybuenas.com.mx</strong>
                    <span>
                        {t('footer.madeWith')} <FaHeart className="footer__heart" aria-hidden="true" />{' '}
                        {t('footer.tradition')}
                    </span>
                    <span>
                        {t('footer.creator')} <strong>Carlos Vega</strong>
                    </span>
                </div>

                <nav className="footer__links" aria-label={t('footer.linksLabel')}>
                    {/* Con sesión iniciada, inicio lleva al panel: el enlace no tendría a dónde llegar. */}
                    {!user && <Link to={{ pathname: '/', hash: `#${ABOUT_SECTION_ID}` }}>{t('footer.about')}</Link>}
                    <Link to="/como-se-juega">{t('footer.howToPlay')}</Link>
                    <Link to="/que-es-la-loteria">{t('footer.whatIsLoteria')}</Link>
                    <Link to="/privacidad">{t('footer.privacy')}</Link>
                    {socialLinks.map(({ label, url }) => (
                        <a key={label} href={url} target="_blank" rel="noopener noreferrer">
                            {label}
                        </a>
                    ))}
                </nav>
            </div>

            <div className="footer__inner footer__contact">
                <span>
                    {t('footer.devOffer')} <a href={`mailto:${CONTACT_EMAIL}`}>{t('footer.letTalk')}</a>
                </span>
                <span className="footer__contact-item">
                    <FaEnvelope aria-hidden="true" />
                    {CONTACT_EMAIL}
                </span>
                <a href={PAYPAL_URL} target="_blank" rel="noopener noreferrer" className="footer__contact-item">
                    <FaPaypal aria-hidden="true" />
                    {t('footer.support')}
                </a>
            </div>

            <div className="footer__inner footer__bottom">
                <span>&copy; {currentYear} Lotería Personalizada</span>
                <span>{t('footer.slogan')}</span>
            </div>
        </footer>
    );
};
