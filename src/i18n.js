/**
 * @module i18n
 * @description Internationalization configuration using i18next.
 * Currently supports English (en) and French (fr) translations.
 *
 * Translation strings live in `src/locales/<lang>.json`, one file per language, so they can be
 * edited without touching code. To add a language, drop in a new JSON file and register it in
 * `resources` below.
 *
 * Usage in components:
 * ```javascript
 * import { useTranslation } from 'react-i18next';
 * const { t } = useTranslation();
 * return <div>{t('panel.display')}</div>;
 * ```
 */

import i18n from 'i18next';
import {initReactI18next} from 'react-i18next';

import en from './locales/en.json';
import fr from './locales/fr.json';

/**
 * Translation resources organized by language and namespace.
 * @constant {Object}
 */
const resources = {
  en: {translation: en},
  fr: {translation: fr}
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'fr', // default language set to French
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
