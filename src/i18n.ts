import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Traducciones en src para que Vite pueda importarlas como módulos (public no se puede importar desde JS)
import translationES from './locales/es/translation.json';
import translationEN from './locales/en/translation.json';

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
        // El sitio abre en español; el inglés solo si se eligió con el selector (FEAT-21).
        detection: {
            order: ['localStorage'],
            caches: ['localStorage']
        },
        interpolation: {
            escapeValue: false // react already safes from xss
        }
    });

const syncDocumentLanguage = (language: string) => {
    document.documentElement.lang = language.startsWith('en') ? 'en' : 'es';
};
if (typeof document !== 'undefined') {
    syncDocumentLanguage(i18n.language ?? 'es');
    i18n.on('languageChanged', syncDocumentLanguage);
}

export default i18n;
