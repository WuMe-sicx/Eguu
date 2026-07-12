import { locales } from '@/i18n/config'

// §18 草稿预览请求校验(纯函数,便于单测)。安全要点:
// - previewSecret 必须与 env 完全一致(env 未配置直接拒);
// - 只接受站内相对路径,首段必须是已知 locale(挡协议相对 //、反斜杠 /\、外链、非法语言前缀);
// - collection 必须在白名单内。
// 真正的管理员身份校验在 route 里用 payload.auth 完成(需请求上下文,不进纯函数)。

const PREVIEW_COLLECTIONS = new Set(['cases', 'services', 'news', 'home', 'about', 'contact'])

export function isSafePreviewPath(path: string | null | undefined): path is string {
  if (typeof path !== 'string' || !path.startsWith('/')) return false
  if (path.startsWith('//') || path.startsWith('/\\')) return false // 协议相对 / 反斜杠 → 开放重定向
  const seg = path.split('/')[1] // '/zh/work/x' → 'zh'
  return (locales as readonly string[]).includes(seg)
}

// 后台「预览」按钮 URL(§18)。secret 只出现在服务端生成、仅登录管理员可见的 URL 里,不进客户端包。
export function previewURL(collection: string, path: string): string {
  const params = new URLSearchParams({
    previewSecret: process.env.PREVIEW_SECRET || '',
    collection,
    path,
  })
  return `/preview?${params.toString()}`
}

export type PreviewCheck = { ok: true; path: string } | { ok: false; status: number; message: string }

export function checkPreviewParams(params: {
  previewSecret: string | null
  path: string | null
  collection: string | null
  secret: string | undefined
}): PreviewCheck {
  const { previewSecret, path, collection, secret } = params
  if (!secret || previewSecret !== secret) return { ok: false, status: 403, message: '无预览权限' }
  if (!isSafePreviewPath(path)) return { ok: false, status: 400, message: '非法预览路径' }
  if (collection && !PREVIEW_COLLECTIONS.has(collection)) {
    return { ok: false, status: 400, message: '非法 collection' }
  }
  return { ok: true, path }
}
