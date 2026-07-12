import { draftMode } from 'next/headers'
import { redirect } from 'next/navigation'

import { isSafePreviewPath } from '@/lib/preview'

// 退出草稿预览:关 draftMode 后跳回源页(仅接受站内相对路径,否则回首页)。
export async function GET(req: Request): Promise<Response> {
  const draft = await draftMode()
  draft.disable()
  const path = new URL(req.url).searchParams.get('path')
  redirect(isSafePreviewPath(path) ? path : '/')
}
