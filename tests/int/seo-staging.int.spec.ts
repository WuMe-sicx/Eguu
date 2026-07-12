// @vitest-environment node
// staging 分支需在模块加载前置好 env(IS_STAGING 在 seo.ts 模块初始化时读取),故用 resetModules + 动态 import。
import { describe, it, expect, vi, afterEach } from 'vitest'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

describe('阶段6 SEO · staging noindex', () => {
  it('staging:robots 全站禁抓 / sitemap 空 / metadata noindex', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_ENV', 'staging')
    vi.resetModules()

    const robots = (await import('@/app/robots')).default
    const sitemap = (await import('@/app/sitemap')).default
    const { buildMetadata } = await import('@/lib/seo')

    expect((robots().rules as { disallow?: string }).disallow).toBe('/')
    expect(await sitemap()).toEqual([]) // staging 分支提前返回,不查库
    expect(buildMetadata({ locale: 'zh', path: '/work' }).robots).toMatchObject({
      index: false,
      follow: false,
    })
  })

  it('生产(非 staging):robots 允许抓取 + 指向 sitemap;metadata 无 noindex', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_ENV', '')
    vi.resetModules()

    const robots = (await import('@/app/robots')).default
    const { buildMetadata } = await import('@/lib/seo')

    const r = robots()
    expect((r.rules as { allow?: string }).allow).toBe('/')
    expect(r.sitemap).toContain('/sitemap.xml')
    expect(buildMetadata({ locale: 'zh', path: '/work' }).robots).toBeUndefined()
  })
})
