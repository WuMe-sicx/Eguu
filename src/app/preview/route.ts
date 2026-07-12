import { draftMode } from 'next/headers'
import { redirect } from 'next/navigation'
import type { PayloadRequest } from 'payload'
import { getPayload } from 'payload'

import { checkPreviewParams } from '@/lib/preview'
import config from '@/payload.config'

// §18 草稿预览入口:previewSecret + 路径/collection 白名单(纯函数)→ 管理员认证 → 开 draftMode → 跳目标。
// 放在 app 根(非 (payload)/(frontend) 组),避开 /api catch-all;proxy matcher 已排除 /preview 免被语言重定向。
export async function GET(req: Request): Promise<Response> {
  const { searchParams } = new URL(req.url)
  const check = checkPreviewParams({
    previewSecret: searchParams.get('previewSecret'),
    path: searchParams.get('path'),
    collection: searchParams.get('collection'),
    secret: process.env.PREVIEW_SECRET,
  })
  if (!check.ok) return new Response(check.message, { status: check.status })

  // 第二道闸:必须是登录的管理员/编辑(仅有 secret 不足以预览)
  const payload = await getPayload({ config })
  let user
  try {
    const result = await payload.auth({
      req: req as unknown as PayloadRequest,
      headers: req.headers,
    })
    user = result.user
  } catch {
    return new Response('无预览权限', { status: 403 })
  }

  const draft = await draftMode()
  if (!user) {
    draft.disable()
    return new Response('无预览权限', { status: 403 })
  }

  draft.enable()
  redirect(check.path) // 已过白名单的站内相对路径
}
