import { useTranslation } from 'react-i18next';
import { FaGlobe } from 'react-icons/fa';
import './LanguageSwitcher.css';

export const LanguageSwitcher = () => {
    const { i18n } = useTranslation();

    const toggleLanguage = () => {
        const newLang = i18n.language.startsWith('es') ? 'en' : 'es';
        i18n.changeLanguage(newLang);
    };

    const currentLangLabel = i18n.language.startsWith('es') ? 'ES' : 'EN';

    return (
        <button
            className="language-switcher"
            onClick={toggleLanguage}
            title={i18n.language.startsWith('es') ? 'Cambiar a Inglés' : 'Switch to Spanish'}
            aria-label="Toggle language"
        >
            <FaGlobe className="language-switcher__icon" />
            <span className="language-switcher__label">{currentLangLabel}</span>
        </button>
    );
};
