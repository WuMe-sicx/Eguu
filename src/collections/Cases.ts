import type { CollectionConfig } from 'payload'
import { APIError } from 'payload'

import { isAdmin, isEditor, publishedOrLoggedIn } from '../access'
import { slugField } from '../fields/slug'
import { requireBilingual } from '../hooks/requireBilingual'
import { isAllowedVideoId } from '../lib/validators'

export const Cases: CollectionConfig = {
  slug: 'cases',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'client', '_status'],
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
    { name: 'client', type: 'text', required: true, localized: true },
    { name: 'services', type: 'relationship', relationTo: 'services', hasMany: true },
    { name: 'cover', type: 'upload', relationTo: 'media' },
    { name: 'gallery', type: 'upload', relationTo: 'media', hasMany: true },
    {
      name: 'videoType',
      type: 'select',
      options: [
        { label: '自托管', value: 'selfHosted' },
        { label: '嵌入', value: 'embed' },
      ],
    },
    {
      name: 'videoFile',
      type: 'upload',
      relationTo: 'media',
      // filterOptions 在字段校验运行时(=发布路径)服务端强制:发布不能引用非视频 media。
      // 草稿保存跳过字段校验(drafts.validate:false),允许暂存不完整引用,发布时才拒。
      filterOptions: { mimeType: { contains: 'video' } },
      admin: { condition: (d) => d?.videoType === 'selfHosted' },
    },
    {
      name: 'videoEmbed',
      type: 'group',
      admin: { condition: (d) => d?.videoType === 'embed' },
      fields: [
        {
          name: 'provider',
          type: 'select',
          options: [
            { label: '腾讯视频', value: 'tencent' },
            { label: '哔哩哔哩', value: 'bilibili' },
          ],
        },
        { name: 'videoId', type: 'text' },
      ],
    },
    { name: 'intro', type: 'richText', required: true, localized: true },
  ],
  hooks: {
    beforeValidate: [
      requireBilingual(['title', 'client', 'intro']),
      ({ data }) => {
        if (!data) return data
        const published = data._status === 'published'

        if (data.videoType === 'selfHosted') {
          data.videoEmbed = null // 互斥:清另一侧
          if (published && !data.videoFile) throw new APIError('发布前需上传自托管视频', 400)
        } else if (data.videoType === 'embed') {
          data.videoFile = null
          const e = data.videoEmbed
          // 只存 ID 且必须过平台白名单格式(不存任意 embed HTML)
          if (e?.videoId && !isAllowedVideoId(e.provider, e.videoId)) {
            throw new APIError('视频 ID 格式非法', 400)
          }
          if (published && (!e?.provider || !e?.videoId)) {
            throw new APIError('发布前需填写嵌入视频平台与 ID', 400)
          }
        } else {
          data.videoFile = null
          data.videoEmbed = null
        }
        return data
      },
    ],
  },
}
