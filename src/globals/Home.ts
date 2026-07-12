import type { GlobalConfig } from 'payload'

import { isEditor, publishedOrLoggedIn } from '../access'

export const Home: GlobalConfig = {
  slug: 'home',
  // read 用 publishedOrLoggedIn:匿名得到 where{_status:published},该 where 会被 append 到 draft
  // 版本查询上 → 匿名 ?draft=true 也拿不到草稿;登录内容角色可读草稿。
  access: { read: publishedOrLoggedIn, update: isEditor, readVersions: isEditor },
  versions: { drafts: true },
  fields: [
    {
      name: 'hero',
      type: 'group',
      label: '主视觉',
      fields: [
        { name: 'title', type: 'text', localized: true },
        { name: 'subtitle', type: 'textarea', localized: true },
        { name: 'background', type: 'upload', relationTo: 'media' },
        { name: 'ctaLabel', type: 'text', localized: true },
        { name: 'ctaHref', type: 'text' },
      ],
    },
    { name: 'intro', type: 'richText', localized: true },
    { name: 'featuredServices', type: 'relationship', relationTo: 'services', hasMany: true },
    // 精选案例唯一来源:显式挑选 + 关系数组顺序即展示顺序(可拖拽)
    { name: 'featuredCases', type: 'relationship', relationTo: 'cases', hasMany: true },
    {
      name: 'contactCta',
      type: 'group',
      label: '联系入口 CTA',
      fields: [
        { name: 'title', type: 'text', localized: true },
        { name: 'ctaLabel', type: 'text', localized: true },
        { name: 'ctaHref', type: 'text' },
      ],
    },
  ],
}
