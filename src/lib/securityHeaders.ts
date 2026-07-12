// §12 前台安全响应头 / 务实 CSP(纯函数,无依赖,便于单测与 next.config 复用)。
// 严格 nonce 版随部署域名/CDN 后置阶段7;统计脚本本身固定(components/Analytics),CSP 作纵深防御。

// 作用域:排除 admin/api/_next(Payload 面板与 REST 自管;静态资源无需 CSP)。
export const SECURITY_SOURCE = '/((?!admin|api|_next).*)'

const A_SCRIPT = ['https://hm.baidu.com', 'https://www.googletagmanager.com', 'https://cloud.umami.is']
const A_CONNECT = [
  'https://hm.baidu.com',
  'https://www.google-analytics.com',
  'https://region1.google-analytics.com',
  'https://cloud.umami.is',
]
const A_IMG = ['https://hm.baidu.com', 'https://www.google-analytics.com']
const VIDEO_FRAME = ['https://v.qq.com', 'https://player.bilibili.com']

// 只接受 http/https 的规范化 origin(去路径/尾斜杠);非法/含注入字符 → null,不拼进 CSP。
export function normalizeMediaHost(raw?: string): string | null {
  if (!raw) return null
  try {
    const u = new URL(raw)
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.origin : null
  } catch {
    return null
  }
}

export function buildCsp(opts: { isDev: boolean; mediaHost?: string | null }): string {
  const media = opts.mediaHost ? [opts.mediaHost] : []
  return [
    `default-src 'self'`,
    `base-uri 'self'`,
    `object-src 'none'`,
    `frame-ancestors 'self'`,
    `form-action 'self'`,
    // dev 需 unsafe-eval(Next HMR);生产不含。unsafe-inline 为已确认的阶段性取舍。
    `script-src 'self' 'unsafe-inline'${opts.isDev ? " 'unsafe-eval'" : ''} ${A_SCRIPT.join(' ')}`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob: ${[...A_IMG, ...media].join(' ')}`,
    `media-src 'self' ${media.join(' ')}`,
    `font-src 'self' data:`,
    `connect-src 'self'${opts.isDev ? ' ws:' : ''} ${[...A_CONNECT, ...media].join(' ')}`,
    `frame-src 'self' ${VIDEO_FRAME.join(' ')}`,
    `worker-src 'self' blob:`,
  ]
    .join('; ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function securityHeaders(opts: { isDev: boolean; mediaHost?: string | null }) {
  return [
    { key: 'Content-Security-Policy', value: buildCsp(opts) },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  ]
}
