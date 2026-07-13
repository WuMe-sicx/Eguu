// 主域名归一(SEO):把 www ↔ apex 的「别名主机」308 到 NEXT_PUBLIC_SERVER_URL 指定的主域名,
// 避免主/别名双份内容分散权重。别名由主域名单一派生(apex→www.apex,或 www.x→x),无硬编码、改域名不漏改。
// 纯函数便于单测 + next.config 复用;host 匹配在运行时按请求 Host 头生效(§12)。
//
// 关键:Next(prepare-destination.js 的 matchHas)对 host 条件的处理决定了 value 的写法——
//   1) 匹配前先从请求 Host **去端口 + 转小写**(host.split(':')[0].toLowerCase());
//   2) 把 has.value 当**锚定正则** new RegExp(`^${value}$`)。
// 故 has.value 必须是「去端口 + 正则转义」的 hostname(否则 `.` 会通配相似域名、带端口的主机永不命中);
// destination 用完整 origin(保留协议+端口)指向主域名。

// 正则元字符转义(MDN 标准式)。合法 hostname 里主要是 `.`,但一并转义以防 IPv6/异常输入。
const escapeRegex = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

type HostRedirect = {
  source: string
  has: Array<{ type: 'host'; value: string }>
  destination: string
  permanent: boolean
}

export function canonicalHostRedirects(serverUrl: string | undefined): HostRedirect[] {
  if (!serverUrl) return [] // dev/未配 → 不归一(回退 localhost,无主域名概念)
  let url: URL
  try {
    url = new URL(serverUrl)
  } catch {
    return []
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return [] // 只归一 http(s) 站点
  const hostname = url.hostname // 已小写、不含端口;www 前缀决定别名方向
  const aliasHost = hostname.startsWith('www.') ? hostname.slice(4) : `www.${hostname}`
  return [
    {
      source: '/:path*',
      has: [{ type: 'host', value: escapeRegex(aliasHost) }], // 见顶部注释:去端口 + 正则转义
      destination: `${url.origin}/:path*`, // origin 保留协议+端口,指向主域名
      permanent: true, // 308:主域名固定,永久归一
    },
  ]
}
