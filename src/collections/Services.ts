import type { CollectionConfig } from 'payload'

import { isAdmin, isEditor, publishedOrLoggedIn } from '../access'
import { slugField } from '../fields/slug'
import { requireBilingual } from '../hooks/requireBilingual'

export const Services: CollectionConfig = {
  slug: 'services',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', '_status'],
  },
  orderable: true,
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
    { name: 'icon', type: 'upload', relationTo: 'media' },
    { name: 'cover', type: 'upload', relationTo: 'media' },
    { name: 'summary', type: 'textarea', required: true, localized: true },
    { name: 'detail', type: 'richText', required: true, localized: true },
  ],
  hooks: {
    beforeValidate: [requireBilingual(['title', 'summary', 'detail'])],
  },
}
