// 纯校验函数(无副作用),集中在此便于复用与单测。
// 安全要点:视频嵌入只存 ID(不存任意 embed HTML);统计只存结构化供应商+ID(不存任意脚本)。

/** 视频嵌入平台 → 合法 ID 格式白名单 */
const VIDEO_ID_PATTERN: Record<string, RegExp> = {
  tencent: /^[A-Za-z0-9]+$/, // 腾讯视频 vid
  bilibili: /^(BV[A-Za-z0-9]+|av\d+)$/, // B 站 BV/av 号
}

export const isVideoProvider = (p: unknown): p is keyof typeof VIDEO_ID_PATTERN =>
  typeof p === 'string' && Object.hasOwn(VIDEO_ID_PATTERN, p)

export const isAllowedVideoId = (provider: unknown, id: unknown): boolean => {
  if (!isVideoProvider(provider) || typeof id !== 'string') return false
  return VIDEO_ID_PATTERN[provider].test(id)
}

/** 统计供应商 → 站点/测量 ID 格式白名单 */
const ANALYTICS_ID_PATTERN: Record<string, RegExp> = {
  baidu: /^[a-f0-9]{32}$/i, // 百度统计 hm.js id
  google: /^G-[A-Z0-9]{4,}$/, // GA4 measurement id
  umami: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, // umami website id(UUID)
}

export const isAnalyticsProvider = (p: unknown): p is keyof typeof ANALYTICS_ID_PATTERN =>
  typeof p === 'string' && Object.hasOwn(ANALYTICS_ID_PATTERN, p)

export const isAllowedAnalyticsId = (provider: unknown, id: unknown): boolean => {
  if (!isAnalyticsProvider(provider) || typeof id !== 'string') return false
  return ANALYTICS_ID_PATTERN[provider].test(id)
}

/** #rrggbb 十六进制色(品牌色注入 CSS 变量,防注入) */
export const isValidHexColor = (v: unknown): boolean =>
  typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v)

// ── 上传内容嗅探(纯函数,便于单测)──
// sharp 报告的格式 → 对应 MIME。注意 sharp 0.34 把 AVIF 报成 format:'heif' + compression:'av1'。
const SHARP_FORMAT_TO_MIME: Record<string, string> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  avif: 'image/avif',
}

/** 由 sharp metadata 推断真实图片 MIME;无法识别或 HEIC(hevc)返回 undefined */
export const imageMimeFromSharp = (meta: { format?: string; compression?: string }): string | undefined => {
  if (meta.format === 'heif') return meta.compression === 'av1' ? 'image/avif' : undefined // hevc=HEIC 不允许
  return meta.format ? SHARP_FORMAT_TO_MIME[meta.format] : undefined
}

/** 视频容器 magic-byte 校验:mp4 的 box 头含 'ftyp';webm/mkv 以 EBML 头 1A45DFA3 开头 */
export const isVideoContainer = (head: Uint8Array, mime: string): boolean => {
  if (mime === 'video/mp4') {
    return head.length >= 12 && Buffer.from(head.subarray(4, 8)).toString('ascii') === 'ftyp'
  }
  if (mime === 'video/webm') {
    return (
      head.length >= 4 &&
      head[0] === 0x1a &&
      head[1] === 0x45 &&
      head[2] === 0xdf &&
      head[3] === 0xa3
    )
  }
  return false
}
