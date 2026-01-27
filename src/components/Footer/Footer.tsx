import { FaEnvelope, FaPaypal } from 'react-icons/fa';
import './Footer.css';

export const Footer = () => {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="footer--compact">
            <div className="container footer__container">
                <div className="footer__main">
                    <div className="footer__info">
                        <h3 className="footer__logo">Lotería Personalizada</h3>
                        <p className="footer__creator">
                            Creado por <strong>Carlos Vega</strong>
                        </p>
                    </div>

                    <div className="footer__dev-offer">
                        <p>¿Necesitas una aplicación web? <a href="mailto:carlos.tests01@gmail.com" className="footer__email-link">¡Hablemos!</a></p>
                        <div className="footer__actions">
                            <div className="footer__contact-item">
                                <FaEnvelope className="footer__icon" />
                                <span>carlos.tests01@gmail.com</span>
                            </div>
                            <a href="https://paypal.me/cavegam" target="_blank" rel="noopener noreferrer" className="footer__paypal-link">
                                <FaPaypal />
                                <span>Apoyar proyecto</span>
                            </a>
                        </div>
                    </div>
                </div>

                <div className="footer__bottom">
                    <p className="footer__copyright">
                        &copy; {currentYear} Lotería Personalizada
                    </p>
                    <p className="footer__slogan">Haciendo el juego más personal</p>
                </div>
            </div>
        </footer>
    );
};
