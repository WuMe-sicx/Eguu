import type { Locale } from '@/i18n'
import { SERVER_URL } from '@/lib/seo'
import type { Case, News } from '@/payload-types'

// JSON-LD 结构化数据(§12)。用 JSON.stringify + 转义 '<' 防 </script> 断标签注入,不拼裸 HTML。
export function jsonLdHtml(data: Record<string, unknown>): string {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}

function LdScript({ data }: { data: Record<string, unknown> }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(data) }} />
}

const absImg = (m: unknown): string | undefined => {
  const url = m && typeof m === 'object' ? (m as { url?: string }).url : undefined
  if (!url) return undefined
  return url.startsWith('http') ? url : `${SERVER_URL}${url}`
}

export function CaseJsonLd({ doc, locale }: { doc: Case; locale: Locale }) {
  const image = absImg(doc.cover)
  return (
    <LdScript
      data={{
        '@context': 'https://schema.org',
        '@type': 'CreativeWork',
        name: doc.title,
        ...(doc.client ? { creator: { '@type': 'Organization', name: doc.client } } : {}),
        ...(image ? { image } : {}),
        url: `${SERVER_URL}/${locale}/work/${doc.slug}`,
        inLanguage: locale,
      }}
    />
  )
}

export function NewsJsonLd({ doc, locale }: { doc: News; locale: Locale }) {
  const image = absImg(doc.cover)
  return (
    <LdScript
      data={{
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: doc.title,
        ...(doc.excerpt ? { description: doc.excerpt } : {}),
        ...(doc.publishedAt ? { datePublished: doc.publishedAt } : {}),
        ...(image ? { image } : {}),
        url: `${SERVER_URL}/${locale}/news/${doc.slug}`,
        inLanguage: locale,
      }}
    />
  )
}
