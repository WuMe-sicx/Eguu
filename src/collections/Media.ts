import type { CollectionConfig } from 'payload'
import { APIError } from 'payload'
import sharp from 'sharp'

import { isAdmin, isLoggedIn } from '../access'
import { imageMimeFromSharp, isVideoContainer } from '../lib/validators'

const IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']
const VIDEO_MIME = ['video/mp4', 'video/webm']
const ALLOWED_MIME = [...IMAGE_MIME, ...VIDEO_MIME]

// 扩展名必须与真实 MIME 一致(防伪装:.jpg 实为可执行等)
const EXT_BY_MIME: Record<string, string[]> = {
  'image/jpeg': ['jpg', 'jpeg'],
  'image/png': ['png'],
  'image/webp': ['webp'],
  'image/avif': ['avif'],
  'video/mp4': ['mp4'],
  'video/webm': ['webm'],
}

const MAX_IMAGE_BYTES = 10 * 1024 * 1024 // 10MB
const MAX_VIDEO_BYTES = 200 * 1024 * 1024 // 200MB
const MAX_DIMENSION = 8000 // 单边像素上限

export const Media: CollectionConfig = {
  slug: 'media',
  access: {
    // 公开只读:未发布素材的保密由对象存储签名 URL 负责(见 dev-plan §18 / 阶段 0),非 Payload read 层
    read: () => true,
    create: isLoggedIn,
    update: isLoggedIn,
    delete: isAdmin,
  },
  upload: {
    mimeTypes: ALLOWED_MIME,
    focalPoint: true,
    adminThumbnail: 'thumbnail',
    // 尺寸变体(§13):next/image 按 sizes 取档;视频不生成变体(sharp 仅处理图片)
    imageSizes: [
      { name: 'thumbnail', width: 400, height: 300, position: 'centre' },
      { name: 'card', width: 768 }, // 等比,列表卡片
      { name: 'hero', width: 1920 }, // 等比,首屏大图
    ],
  },
  fields: [{ name: 'alt', type: 'text', required: true, localized: true }],
  hooks: {
    beforeValidate: [
      async ({ req }) => {
        const file = req.file
        if (!file) return // 无新文件(如仅改 alt)时跳过

        const { mimetype, size, name } = file

        if (!ALLOWED_MIME.includes(mimetype)) {
          throw new APIError(`不支持的文件类型:${mimetype}`, 400)
        }

        const ext = name.split('.').pop()?.toLowerCase() ?? ''
        if (!EXT_BY_MIME[mimetype]?.includes(ext)) {
          throw new APIError(`扩展名 .${ext} 与文件类型 ${mimetype} 不匹配`, 400)
        }

        const limit = VIDEO_MIME.includes(mimetype) ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES
        if (size > limit) {
          throw new APIError(
            `文件过大 ${(size / 1024 / 1024).toFixed(1)}MB,上限 ${limit / 1024 / 1024}MB`,
            400,
          )
        }

        if (IMAGE_MIME.includes(mimetype)) {
          const meta = await sharp(file.data).metadata()
          // 用内容嗅探的真实格式核对声明 MIME(非仅信任客户端 mimetype/扩展名)
          if (imageMimeFromSharp(meta) !== mimetype) {
            throw new APIError(`文件内容(${meta.format})与声明类型 ${mimetype} 不符`, 400)
          }
          if ((meta.width ?? 0) > MAX_DIMENSION || (meta.height ?? 0) > MAX_DIMENSION) {
            throw new APIError(
              `图片尺寸过大 ${meta.width}×${meta.height},单边上限 ${MAX_DIMENSION}px`,
              400,
            )
          }
        }

        if (VIDEO_MIME.includes(mimetype) && !isVideoContainer(file.data, mimetype)) {
          throw new APIError(`文件内容与声明视频类型 ${mimetype} 不符`, 400)
          // ponytail: 编码/时长/流结构深检需 ffprobe;阶段 1 只做容器 magic-byte,转码阶段再加
        }
      },
    ],
  },
}
