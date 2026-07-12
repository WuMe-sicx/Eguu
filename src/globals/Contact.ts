import type { GlobalConfig } from 'payload'

import { isEditor, publishedOrLoggedIn } from '../access'
import { previewURL } from '../lib/preview'

export const Contact: GlobalConfig = {
  slug: 'contact',
  admin: {
    preview: (_doc, { locale }) =>
      previewURL('contact', `/${typeof locale === 'string' ? locale : 'zh'}/contact`),
  },
  // 匿名只读已发布(where 会 append 到 draft 版本查询 → 匿名拿不到草稿)
  access: { read: publishedOrLoggedIn, update: isEditor, readVersions: isEditor },
  versions: { drafts: true },
  fields: [
    { name: 'email', type: 'email' },
    { name: 'phone', type: 'text' },
    { name: 'address', type: 'textarea', localized: true },
    {
      name: 'map',
      type: 'group',
      // 仅结构化坐标 + 供应商白名单,不存/渲染任意 embed HTML
      fields: [
        { name: 'lat', type: 'number' },
        { name: 'lng', type: 'number' },
        {
          name: 'provider',
          type: 'select',
          options: [
            { label: '高德', value: 'amap' },
            { label: '百度地图', value: 'baidu' },
            { label: '腾讯地图', value: 'tencent' },
          ],
        },
      ],
    },
    {
      name: 'social',
      type: 'array',
      fields: [
        { name: 'platform', type: 'text', required: true },
        { name: 'url', type: 'text', required: true },
      ],
    },
  ],
}
