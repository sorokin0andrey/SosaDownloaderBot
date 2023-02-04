import i18next, { Resource } from 'i18next'

import ru from './ru.json' assert { type: 'json' }
import en from './en.json' assert { type: 'json' }

export type LocaleKeys = keyof typeof ru

export const localeResources: Resource = {
  ru: { translation: ru },
  uk: { translation: ru },
  be: { translation: ru },
  en: { translation: en },
}

export const initLocales = () => i18next.init({ fallbackLng: 'en', cleanCode: true, resources: localeResources })
