import { describe, it, expect } from 'vitest'

import { canonicalHostRedirects } from '@/lib/canonicalRedirect'

// 纯函数单测(不连库):主域名归一规则。守住「主域名唯一」的 SEO 边界。
//
// 关键:光断言返回结构不足以证明 Next 会按预期跳转——真正的语义在 Next 的 host 匹配里。
// 故复刻 Next 16 matchHas 的 host 逻辑(node_modules/next/.../prepare-destination.js):
//   请求 Host 先「去端口 + 转小写」,再用 has.value 作**锚定正则** new RegExp(`^${value}$`)。
// 用它对真实请求 Host 断言命中/不命中,直接覆盖端口剥离与正则转义两个易错点。
const nextHostMatches = (value: string, reqHost: string): boolean => {
  const hostname = reqHost.split(':', 1)[0].toLowerCase()
  return new RegExp(`^${value}$`).test(hostname)
}

const rule = (serverUrl: string) => {
  const rules = canonicalHostRedirects(serverUrl)
  expect(rules).toHaveLength(1)
  return rules[0]
}

describe('canonicalHostRedirects', () => {
  it('apex 为主域名 → 从 www 别名归一到 apex(308,保 origin)', () => {
    const r = rule('https://egouu.com')
    expect(r.source).toBe('/:path*')
    expect(r.destination).toBe('https://egouu.com/:path*')
    expect(r.permanent).toBe(true)
  })

  it('www 为主域名 → 反向从 apex 归一到 www(方向随主域名派生)', () => {
    const r = rule('https://www.egouu.com')
    expect(r.destination).toBe('https://www.egouu.com/:path*')
    expect(nextHostMatches(r.has[0].value, 'egouu.com')).toBe(true)
    expect(nextHostMatches(r.has[0].value, 'www.egouu.com')).toBe(false) // 主域名自身不再跳(防环)
  })

  // —— 按 Next 真实 host 匹配语义断言(命中面精确)——
  it('别名主机命中,且端口被 Next 剥离后仍命中', () => {
    const r = rule('https://egouu.com')
    expect(nextHostMatches(r.has[0].value, 'www.egouu.com')).toBe(true)
    expect(nextHostMatches(r.has[0].value, 'WWW.EGOUU.COM')).toBe(true) // 大小写不敏感
    expect(nextHostMatches(r.has[0].value, 'www.egouu.com:443')).toBe(true) // 端口被剥离
  })

  it('主域名自身不匹配 → 不产生重定向环', () => {
    const r = rule('https://egouu.com')
    expect(nextHostMatches(r.has[0].value, 'egouu.com')).toBe(false)
  })

  it('点号被正则转义 → 相似主机/子域不被误伤(永久 308 可被缓存,过宽危险)', () => {
    const r = rule('https://egouu.com')
    expect(r.has[0].value).toContain('\\.') // value 里的 . 已转义
    expect(nextHostMatches(r.has[0].value, 'wwwXegouuYcom')).toBe(false) // . 非通配
    expect(nextHostMatches(r.has[0].value, 'www.a.egouu.com')).toBe(false) // 深子域不命中
    expect(nextHostMatches(r.has[0].value, 'evil-www.egouu.com')).toBe(false) // 前缀不命中(已锚定)
  })

  it('含端口的主域名:别名匹配去端口,destination 保端口', () => {
    const r = rule('https://egouu.com:8443')
    expect(nextHostMatches(r.has[0].value, 'www.egouu.com:8443')).toBe(true)
    expect(r.destination).toBe('https://egouu.com:8443/:path*')
  })

  it('source 覆盖根路径与深路径(catch-all)', () => {
    const r = rule('https://egouu.com')
    expect(r.source).toBe('/:path*') // Next 的 /:path* 同时匹配 '' 与多段路径
  })

  it('未配(dev)/非法 URL/非 http(s) → 不归一(空数组)', () => {
    expect(canonicalHostRedirects(undefined)).toEqual([])
    expect(canonicalHostRedirects('')).toEqual([])
    expect(canonicalHostRedirects('not a url')).toEqual([])
    expect(canonicalHostRedirects('ftp://egouu.com')).toEqual([]) // 只归一 http(s)
  })
})
