import type { ReactElement } from 'react'
import { describe, it, expect } from 'vitest'

import Analytics from '@/components/Analytics'
import { jsonLdHtml } from '@/components/JsonLd'
import { buildCsp, normalizeMediaHost, SECURITY_SOURCE } from '@/lib/securityHeaders'
import { buildMetadata } from '@/lib/seo'
import type { SiteSetting } from '@/payload-types'

// 阶段6 SEO 纯逻辑单测:metadata 回退链 / hreflang、统计注入安全门、JSON-LD 转义。
// 不连库(buildMetadata/Analytics/jsonLdHtml 均无副作用)。
describe('阶段6 SEO', () => {
  it('buildMetadata:标题品牌后缀,无 title 时仅品牌', () => {
    const m = buildMetadata({ locale: 'zh', path: '/work', title: '作品' })
    expect(String(m.title)).toContain('作品')
    expect(String(m.title)).toContain('·')
    const home = buildMetadata({ locale: 'zh', path: '' })
    expect(String(home.title)).not.toContain('·') // 无 title → 仅品牌
  })

  it('buildMetadata:描述回退链 入参 > defaultSeo > i18n', () => {
    expect(buildMetadata({ locale: 'zh', path: '', description: 'A' }).description).toBe('A')
    const settings = { defaultSeo: { description: 'B' } } as SiteSetting
    expect(buildMetadata({ locale: 'zh', path: '', settings }).description).toBe('B')
    expect(buildMetadata({ locale: 'zh', path: '', fallbackDescription: 'C' }).description).toBe('C')
  })

  it('buildMetadata:hreflang 中英 + x-default,canonical 带 locale', () => {
    const m = buildMetadata({ locale: 'en', path: '/work/x' })
    const langs = m.alternates?.languages as Record<string, string>
    expect(langs.zh).toBe('/zh/work/x')
    expect(langs.en).toBe('/en/work/x')
    expect(langs['x-default']).toBe('/zh/work/x')
    expect(m.alternates?.canonical).toBe('/en/work/x')
  })

  it('Analytics:none / 非法 id / 未配 → 不注入(返回 null)', () => {
    expect(Analytics({ analytics: { provider: 'none' } })).toBeNull()
    expect(Analytics({ analytics: { provider: 'baidu', measurementId: 'bad' } })).toBeNull()
    expect(Analytics({ analytics: undefined })).toBeNull()
  })

  it('Analytics:合法 baidu → 固定脚本含该 id + 官方域', () => {
    const el = Analytics({ analytics: { provider: 'baidu', measurementId: 'a'.repeat(32) } }) as ReactElement<{
      src: string
    }>
    expect(el).not.toBeNull()
    expect(el.props.src).toContain('a'.repeat(32))
    expect(el.props.src).toContain('hm.baidu.com')
  })

  it('jsonLdHtml:转义 </script> 防断标签注入', () => {
    const html = jsonLdHtml({ name: 'X</script><script>alert(1)</script>' })
    expect(html).not.toContain('</script>')
    expect(html).toContain('\\u003c')
  })

  it('Analytics:合法 google → gtag 双脚本含 id;非法 GA id → 不注入', () => {
    const el = Analytics({ analytics: { provider: 'google', measurementId: 'G-ABCDE12345' } }) as ReactElement<{
      children: ReactElement<{ src?: string; children?: string }>[]
    }>
    const kids = el.props.children
    expect(kids[0].props.src).toContain('G-ABCDE12345')
    expect(kids[0].props.src).toContain('googletagmanager.com')
    expect(kids[1].props.children).toContain("gtag('config','G-ABCDE12345')")
    expect(Analytics({ analytics: { provider: 'google', measurementId: 'not-a-ga-id' } })).toBeNull()
  })

  it('Analytics:合法 umami → data-website-id + 官方域', () => {
    const el = Analytics({
      analytics: { provider: 'umami', measurementId: '123e4567-e89b-12d3-a456-426614174000' },
    }) as ReactElement<{ src: string; 'data-website-id': string }>
    expect(el.props['data-website-id']).toBe('123e4567-e89b-12d3-a456-426614174000')
    expect(el.props.src).toContain('umami.is')
  })

  it('buildCsp:dev 含 unsafe-eval,生产不含;均无 * 且含 provider 域', () => {
    const dev = buildCsp({ isDev: true })
    const prod = buildCsp({ isDev: false })
    expect(dev).toContain("'unsafe-eval'")
    expect(prod).not.toContain("'unsafe-eval'")
    expect(prod).toContain('hm.baidu.com')
    expect(prod).toContain('v.qq.com')
    expect(prod).not.toContain('*') // 不放开通配
    expect(prod).toContain(`default-src 'self'`)
  })

  it('normalizeMediaHost:仅收 http/https origin,非法/注入 → null', () => {
    expect(normalizeMediaHost('https://cdn.example.com/x/')).toBe('https://cdn.example.com')
    expect(normalizeMediaHost('http://cdn.example.com:8080')).toBe('http://cdn.example.com:8080')
    expect(normalizeMediaHost('')).toBeNull()
    expect(normalizeMediaHost('javascript:alert(1)')).toBeNull()
    expect(normalizeMediaHost("https://x; script-src 'unsafe-eval'")).toBeNull() // 含空格/分号 → URL 解析失败
    // 校验后拼进 CSP 也不会引入额外指令
    expect(buildCsp({ isDev: false, mediaHost: normalizeMediaHost('https://cdn.example.com') })).toContain(
      'https://cdn.example.com',
    )
  })

  it('CSP 作用域:排除 admin/api/_next', () => {
    const re = new RegExp(`^${SECURITY_SOURCE.replace(/^\//, '/')}$`)
    expect(re.test('/zh/work')).toBe(true)
    expect(re.test('/admin')).toBe(false)
    expect(re.test('/api/media')).toBe(false)
    expect(re.test('/_next/static/x')).toBe(false)
  })
})
