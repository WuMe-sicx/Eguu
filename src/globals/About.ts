import type { GlobalConfig } from 'payload'

import { isEditor, publishedOrLoggedIn } from '../access'
import { previewURL } from '../lib/preview'

// 团队/客户/奖项本期内嵌为 array(录入快);二期需独立页/复杂排序再升级为 collection。
export const About: GlobalConfig = {
  slug: 'about',
  admin: {
    preview: (_doc, { locale }) =>
      previewURL('about', `/${typeof locale === 'string' ? locale : 'zh'}/about`),
  },
  // 匿名只读已发布(where 会 append 到 draft 版本查询 → 匿名拿不到草稿)
  access: { read: publishedOrLoggedIn, update: isEditor, readVersions: isEditor },
  versions: { drafts: true },
  fields: [
    { name: 'intro', type: 'richText', localized: true },
    {
      name: 'team',
      type: 'array',
      labels: { singular: '成员', plural: '团队' },
      fields: [
        { name: 'avatar', type: 'upload', relationTo: 'media' },
        { name: 'name', type: 'text', required: true, localized: true },
        { name: 'role', type: 'text', localized: true },
        { name: 'bio', type: 'textarea', localized: true },
      ],
    },
    {
      name: 'clients',
      type: 'array',
      labels: { singular: '客户', plural: '客户品牌' },
      fields: [
        { name: 'logo', type: 'upload', relationTo: 'media' },
        { name: 'name', type: 'text', required: true, localized: true },
      ],
    },
    {
      name: 'awards',
      type: 'array',
      labels: { singular: '奖项', plural: '奖项' },
      fields: [
        { name: 'year', type: 'text' },
        { name: 'title', type: 'text', required: true, localized: true },
        { name: 'description', type: 'textarea', localized: true },
      ],
    },
  ],
}
