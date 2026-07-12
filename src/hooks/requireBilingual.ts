import { hasText } from '@payloadcms/richtext-lexical/shared'
import type { CollectionBeforeValidateHook } from 'payload'
import { APIError } from 'payload'

// 单一 _status(§9):发布时校验所有「localized + required」字段中英两语都齐,草稿可缺。
// 用 locale:'all' 取已存两语值,叠加当前 locale 的本次输入。
const LOCALES = ['zh', 'en'] as const
const LOCALE_LABEL: Record<string, string> = { zh: '中文', en: '英文' }

const isEmpty = (v: unknown): boolean => {
  if (v == null) return true
  if (typeof v === 'string') return v.trim() === ''
  // Lexical richText:空编辑器(空 root / 仅空段落)也算空,用 Payload 同款 hasText 判定
  if (typeof v === 'object' && 'root' in (v as object)) {
    return !hasText(v as Parameters<typeof hasText>[0])
  }
  return false
}

export const requireBilingual =
  (fields: string[]): CollectionBeforeValidateHook =>
  async ({ collection, data, originalDoc, req }) => {
    if (!data || data._status !== 'published') return data

    const id = originalDoc?.id ?? data.id
    // 已存两语快照:localized 字段返回 { zh, en }
    const existing = id
      ? ((await req.payload.findByID({
          collection: collection.slug,
          id,
          locale: 'all',
          draft: true,
          depth: 0,
          overrideAccess: true,
        })) as unknown as Record<string, Record<string, unknown> | undefined>)
      : undefined

    // 本次写入面向的 locale(admin 发布时为当前编辑语言;缺省取默认 zh)
    const current = typeof req.locale === 'string' && (LOCALES as readonly string[]).includes(req.locale)
      ? req.locale
      : LOCALES[0]

    for (const field of fields) {
      for (const locale of LOCALES) {
        // 当前 locale 用本次输入(未提供则回退已存);另一 locale 用已存
        const value =
          locale === current ? (data[field] ?? existing?.[field]?.[locale]) : existing?.[field]?.[locale]
        if (isEmpty(value)) {
          throw new APIError(`发布前需补齐「${field}」的${LOCALE_LABEL[locale]}内容`, 400)
        }
      }
    }
    return data
  }
