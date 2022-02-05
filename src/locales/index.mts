import i18next, { Resource } from 'i18next'

import ru from './ru.json'
import en from './en.json'

export type LocaleKeys = keyof typeof ru

export const localeResources: Resource = {
  ru: { translation: ru },
  uk: { translation: ru },
  be: { translation: ru },
  en: { translation: en },
}

export const initLocales = () =>
  i18next.init({ debug: true, fallbackLng: 'en', cleanCode: true, resources: localeResources })
