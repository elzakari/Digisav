import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enTranslation from './locales/en/translation.json';
import frTranslation from './locales/fr/translation.json';
import swTranslation from './locales/sw/translation.json';
import haTranslation from './locales/ha/translation.json';
import yoTranslation from './locales/yo/translation.json';
import igTranslation from './locales/ig/translation.json';

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources: {
            en: {
                translation: enTranslation,
            },
            fr: {
                translation: frTranslation,
            },
            sw: {
                translation: swTranslation,
            },
            ha: {
                translation: haTranslation,
            },
            yo: {
                translation: yoTranslation,
            },
            ig: {
                translation: igTranslation,
            },
        },
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false, // react already safes from xss
        },
        detection: {
            order: ['localStorage', 'navigator'],
            caches: ['localStorage'],
        },
    });

export default i18n;
