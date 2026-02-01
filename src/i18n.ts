import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translations directly for now to avoid issues with loading public folder locally during development
// In a real production app, you might use i18next-http-backend
import translationES from '../public/locales/es/translation.json';
import translationEN from '../public/locales/en/translation.json';

const resources = {
    es: {
        translation: translationES
    },
    en: {
        translation: translationEN
    }
};

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources,
        fallbackLng: 'es',
        interpolation: {
            escapeValue: false // react already safes from xss
        }
    });

export default i18n;
