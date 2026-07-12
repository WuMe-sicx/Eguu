import type { MetadataRoute } from 'next'

import { IS_STAGING, SERVER_URL } from '@/lib/seo'

// §12:staging 全站禁抓;生产允许抓取前台,禁 admin/api,指向 sitemap。
export default function robots(): MetadataRoute.Robots {
  if (IS_STAGING) {
    return { rules: { userAgent: '*', disallow: '/' } }
  }
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/api/'] },
    sitemap: `${SERVER_URL}/sitemap.xml`,
    host: SERVER_URL,
  }
}
