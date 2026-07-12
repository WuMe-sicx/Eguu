import type { Field } from 'payload'

// cases/services/news 共用同一 slug 规则:必填/唯一/索引/^[a-z0-9-]+$/避保留字。
// 不双语(中英共用同一 slug,路由简单)。
const RESERVED = new Set([
  'admin',
  'api',
  'zh',
  'en',
  'work',
  'services',
  'about',
  'news',
  'contact',
  'privacy',
  'sitemap',
  'robots',
  'preview',
])

export const validateSlug = (value: unknown): string | true => {
  if (typeof value !== 'string' || value.length === 0) return 'slug 必填'
  if (!/^[a-z0-9-]+$/.test(value)) return 'slug 仅允许小写字母、数字和连字符'
  if (RESERVED.has(value)) return `slug "${value}" 是保留字,请换一个`
  return true
}

export const slugField = (): Field => ({
  name: 'slug',
  type: 'text',
  required: true,
  unique: true,
  index: true,
  admin: { position: 'sidebar' },
  hooks: {
    // 规范化:去空格 + 小写(校验前)
    beforeValidate: [({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value)],
  },
  validate: validateSlug,
})
