// 可信客户端 IP(§10):只信任 TRUSTED_IP_HEADER 指定的头,该头必须由 CDN/反代注入
// 并在入口剥除同名外部头(如 X-Real-IP / CF-Connecting-IP,单值),从而覆盖外部伪造的 XFF。
// 返回 null 表示无可信 IP(env 未配或头缺失)——由调用方按环境决定回退策略(见 lib/rateLimit),
// 而不是让所有访客共享一个桶(那会让任意 5 次提交拖垮全站)。

export function clientIpFromHeaders(headers: Headers): string | null {
  const headerName = process.env.TRUSTED_IP_HEADER
  if (!headerName) return null
  // 裸 x-forwarded-for 永不可信(客户端可伪造),即便被误配到 env 也拒
  if (headerName.toLowerCase() === 'x-forwarded-for') return null
  // 期望单值可信头;含逗号的多值(XFF 风格)不可信 → 拒
  const raw = headers.get(headerName)?.trim()
  if (!raw || raw.includes(',')) return null
  return raw
}
