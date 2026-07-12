// @vitest-environment node
// §18 预览请求校验(纯函数)单测:secret 缺失/错误 → 403;非法 path/collection → 400;合法 → ok。
// 管理员身份闸(payload.auth)需请求上下文,由 route 手动冒烟覆盖;此处专注可回归的白名单逻辑。
import { describe, expect, it } from 'vitest'

import { checkPreviewParams, isSafePreviewPath } from '@/lib/preview'

const SECRET = 'right-secret'
const base = { previewSecret: SECRET, path: '/zh/work/x', collection: 'cases', secret: SECRET }

describe('§18 预览校验', () => {
  it('env 未配置 secret → 403(不因空串放行)', () => {
    const r = checkPreviewParams({ ...base, secret: undefined })
    expect(r).toMatchObject({ ok: false, status: 403 })
  })

  it('secret 不匹配 → 403', () => {
    expect(checkPreviewParams({ ...base, previewSecret: 'wrong' })).toMatchObject({ ok: false, status: 403 })
    expect(checkPreviewParams({ ...base, previewSecret: null })).toMatchObject({ ok: false, status: 403 })
  })

  it('非法 path → 400(开放重定向/外链/非 locale 前缀)', () => {
    for (const path of [null, '', 'work/x', '//evil.com', '/\\evil', 'https://evil.com', '/fr/x', '/', '/zhx/y']) {
      expect(checkPreviewParams({ ...base, path })).toMatchObject({ ok: false, status: 400 })
    }
  })

  it('非法 collection → 400', () => {
    expect(checkPreviewParams({ ...base, collection: 'admins' })).toMatchObject({ ok: false, status: 400 })
    expect(checkPreviewParams({ ...base, collection: 'inquiries' })).toMatchObject({ ok: false, status: 400 })
  })

  it('secret + 合法 path(+可选 collection)→ ok', () => {
    expect(checkPreviewParams(base)).toMatchObject({ ok: true, path: '/zh/work/x' })
    // collection 可省(全局预览无 collection 也允许)
    expect(checkPreviewParams({ ...base, path: '/en', collection: null })).toMatchObject({ ok: true })
    // 全局路径
    expect(checkPreviewParams({ ...base, path: '/en/about', collection: 'about' })).toMatchObject({ ok: true })
  })

  it('isSafePreviewPath 边界', () => {
    expect(isSafePreviewPath('/zh')).toBe(true)
    expect(isSafePreviewPath('/en/news/a')).toBe(true)
    expect(isSafePreviewPath('//evil')).toBe(false)
    expect(isSafePreviewPath('/\\evil')).toBe(false)
    expect(isSafePreviewPath('https://evil')).toBe(false)
    expect(isSafePreviewPath('/fr')).toBe(false)
    expect(isSafePreviewPath(null)).toBe(false)
    expect(isSafePreviewPath(undefined)).toBe(false)
  })
})
