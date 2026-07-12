import type { Metadata } from 'next'
import { cache } from 'react'

import { getDict, type Locale } from '@/i18n'
import { getPublicGlobal } from '@/lib/payload'
import type { Media, SiteSetting } from '@/payload-types'

// site-settings 每请求缓存:generateMetadata + 页面/布局多处取用只查一次。
export const getCachedSettings = cache(
  (locale: Locale): Promise<SiteSetting | null> =>
    getPublicGlobal('site-settings', locale).catch(() => null),
)

// 站点绝对基址(canonical/OG/sitemap 用)。dev 回退 localhost。末尾斜杠归一。
export const SERVER_URL = (process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000').replace(/\/+$/, '')
// staging 全站 noindex(§12),防预发布被收录。
export const IS_STAGING = process.env.NEXT_PUBLIC_SITE_ENV === 'staging'

const OG_LOCALE: Record<Locale, string> = { zh: 'zh_CN', en: 'en_US' }

type MediaLike = number | Media | null | undefined
const mediaUrl = (m: MediaLike): string | undefined =>
  m && typeof m === 'object' ? (m.url ?? undefined) : undefined

type BuildArgs = {
  locale: Locale
  /** 站内路径,不含 locale 前缀,如 '' | '/work' | '/work/slug' */
  path: string
  title?: string | null
  description?: string | null
  /** doc 的 SEO 插件 meta.image(优先于 defaultSeo.ogImage) */
  image?: MediaLike
  type?: 'website' | 'article'
  settings?: SiteSetting | null
  /** 页面级默认描述(i18n),回退链最末位之一 */
  fallbackDescription?: string
}

// 统一 metadata 构造(§9/§12)。描述回退链:入参 → defaultSeo → i18n → 品牌标语。
// 相对路径/图片 URL 由 metadataBase 解析为绝对;发布内容中英必填 → hreflang 两语都真存在。
export function buildMetadata(args: BuildArgs): Metadata {
  const { locale, path, type = 'website', settings } = args
  const dict = getDict(locale)
  const brand = settings?.siteName || dict.brand.name

  const pageTitle = args.title?.trim() || settings?.defaultSeo?.title?.trim() || ''
  const fullTitle = pageTitle && pageTitle !== brand ? `${pageTitle} · ${brand}` : brand
  const description =
    args.description?.trim() ||
    settings?.defaultSeo?.description?.trim() ||
    args.fallbackDescription?.trim() ||
    dict.footer.tagline
  const ogImage = mediaUrl(args.image) ?? mediaUrl(settings?.defaultSeo?.ogImage)

  const canonical = `/${locale}${path}`
  const languages = { zh: `/zh${path}`, en: `/en${path}`, 'x-default': `/zh${path}` }

  return {
    metadataBase: new URL(SERVER_URL),
    title: fullTitle,
    description,
    alternates: { canonical, languages },
    ...(IS_STAGING ? { robots: { index: false, follow: false } } : {}),
    openGraph: {
      title: fullTitle,
      description,
      url: canonical,
      siteName: brand,
      locale: OG_LOCALE[locale],
      type,
      ...(ogImage ? { images: [{ url: ogImage }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
  }
}
