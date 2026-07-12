// UI 语言配置(与 payload.config localization 对齐)
export const locales = ['zh', 'en'] as const
export type Locale = (typeof locales)[number]
export const defaultLocale: Locale = 'zh'

export const isLocale = (v: string): v is Locale => (locales as readonly string[]).includes(v)
