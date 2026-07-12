import type { Locale } from './config'
import en from './en'
import zh, { type Dict } from './zh'

const dicts: Record<Locale, Dict> = { zh, en }

export const getDict = (locale: Locale): Dict => dicts[locale]
export type { Dict }
export { locales, defaultLocale, isLocale, type Locale } from './config'
