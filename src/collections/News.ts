import type { CollectionConfig } from 'payload'
import { APIError } from 'payload'

import { isAdmin, isEditor, publishedOrLoggedIn } from '../access'
import { slugField } from '../fields/slug'
import { requireBilingual } from '../hooks/requireBilingual'

export const News: CollectionConfig = {
  slug: 'news',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'publishedAt', '_status'],
  },
  defaultSort: '-publishedAt',
  versions: { drafts: true },
  access: {
    create: isEditor,
    read: publishedOrLoggedIn,
    update: isEditor,
    delete: isAdmin,
    readVersions: isEditor, // 草稿/版本只对登录内容角色可读
  },
  fields: [
    { name: 'title', type: 'text', required: true, localized: true },
    slugField(),
    { name: 'cover', type: 'upload', relationTo: 'media' },
    { name: 'excerpt', type: 'textarea', required: true, localized: true },
    { name: 'body', type: 'richText', required: true, localized: true },
    {
      name: 'publishedAt',
      type: 'date',
      admin: { position: 'sidebar', date: { pickerAppearance: 'dayAndTime' } },
    },
  ],
  hooks: {
    beforeValidate: [
      requireBilingual(['title', 'excerpt', 'body']),
      ({ data }) => {
        // 发布必填 publishedAt(草稿可空)
        if (data?._status === 'published' && !data.publishedAt) {
          throw new APIError('发布新闻前必须填写发布时间', 400)
        }
        return data
      },
    ],
  },
}
