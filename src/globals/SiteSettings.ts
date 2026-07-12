import type { GlobalConfig } from 'payload'
import { APIError } from 'payload'

import { isAdmin } from '../access'
import { isAllowedAnalyticsId, isValidHexColor } from '../lib/validators'

export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  // 即时生效、仅 admin 可改(不开草稿)
  access: { read: () => true, update: isAdmin },
  fields: [
    { name: 'siteName', type: 'text', required: true, localized: true },
    { name: 'logo', type: 'upload', relationTo: 'media' },
    {
      name: 'brandColor',
      type: 'text',
      defaultValue: '#5CC8FF',
      admin: { description: '品牌主色 #rrggbb' },
      validate: (v: unknown) => isValidHexColor(v) || '需为 #rrggbb 格式',
    },
    {
      name: 'nav',
      type: 'array',
      localized: true,
      labels: { singular: '导航项', plural: '主导航' },
      fields: [
        { name: 'label', type: 'text', required: true },
        { name: 'href', type: 'text', required: true },
      ],
    },
    {
      name: 'footer',
      type: 'group',
      fields: [
        { name: 'text', type: 'textarea', localized: true },
        { name: 'icp', type: 'text', admin: { description: 'ICP 备案号' } },
        { name: 'publicSecurity', type: 'text', admin: { description: '公安联网备案号' } },
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
    {
      name: 'defaultSeo',
      type: 'group',
      fields: [
        { name: 'title', type: 'text', localized: true },
        { name: 'description', type: 'textarea', localized: true },
        { name: 'ogImage', type: 'upload', relationTo: 'media' },
      ],
    },
    {
      name: 'analytics',
      type: 'group',
      admin: { description: '统计:仅结构化 供应商+ID,不接受任意脚本' },
      fields: [
        {
          name: 'provider',
          type: 'select',
          defaultValue: 'none',
          options: [
            { label: '不启用', value: 'none' },
            { label: '百度统计', value: 'baidu' },
            { label: 'Google Analytics', value: 'google' },
            { label: 'Umami', value: 'umami' },
          ],
        },
        { name: 'measurementId', type: 'text' },
      ],
    },
  ],
  hooks: {
    beforeValidate: [
      ({ data }) => {
        const a = data?.analytics
        if (a?.provider && a.provider !== 'none' && !isAllowedAnalyticsId(a.provider, a.measurementId)) {
          throw new APIError(`统计 ID 不符合 ${a.provider} 的格式规范`, 400)
        }
        return data
      },
    ],
  },
}
