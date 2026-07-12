import type { MetadataRoute } from 'next'

import { locales } from '@/i18n/config'
import { findPublished } from '@/lib/payload'
import { IS_STAGING, SERVER_URL } from '@/lib/seo'

// §12 站点地图:静态页 + 已发布内容,每条带中英 hreflang(slug 不双语,两语共用)。
// staging 全站 noindex → 返回空 sitemap。

const STATIC_PATHS = ['', '/work', '/services', '/about', '/news', '/contact', '/privacy']
const COLLECTIONS = [
  { collection: 'cases', prefix: '/work' },
  { collection: 'services', prefix: '/services' },
  { collection: 'news', prefix: '/news' },
] as const

const abs = (p: string) => `${SERVER_URL}${p}`
const langAlts = (path: string) => ({ languages: { zh: abs(`/zh${path}`), en: abs(`/en${path}`) } })

// 分页读取某集合全部已发布 slug(不静默截断)。depth:0 只取 slug/updatedAt。
// 查询失败**不吞**:让异常传播,使 /sitemap.xml 明确失败(可被监控/重试),
// 而不是把截至上一页的部分结果当作正常 sitemap 对外发布(会导致已发布页悄悄消失)。
async function allPublished(
  collection: (typeof COLLECTIONS)[number]['collection'],
): Promise<{ slug: string; updatedAt?: string }[]> {
  const out: { slug: string; updatedAt?: string }[] = []
  for (let page = 1; ; page++) {
    const res = await findPublished(collection, 'zh', { limit: 500, page, depth: 0 })
    for (const doc of res.docs as { slug?: string; updatedAt?: string }[]) {
      if (doc.slug) out.push({ slug: doc.slug, updatedAt: doc.updatedAt })
    }
    if (!res.hasNextPage) break
  }
  return out
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (IS_STAGING) return []

  const entries: MetadataRoute.Sitemap = []

  for (const path of STATIC_PATHS) {
    for (const locale of locales) {
      entries.push({ url: abs(`/${locale}${path}`), alternates: langAlts(path) })
    }
  }

  for (const { collection, prefix } of COLLECTIONS) {
    for (const { slug, updatedAt } of await allPublished(collection)) {
      const path = `${prefix}/${slug}`
      for (const locale of locales) {
        entries.push({ url: abs(`/${locale}${path}`), lastModified: updatedAt, alternates: langAlts(path) })
      }
    }
  }

  return entries
}
