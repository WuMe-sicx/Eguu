import { notFound } from 'next/navigation'

import { NewsCard } from '@/components/cards'
import Media from '@/components/Media'
import RichText from '@/components/RichText'
import { getDict, isLocale, locales } from '@/i18n'
import { getNews, getNewsBySlug, getRelatedNews } from '@/lib/content'

export const revalidate = 60

export async function generateStaticParams() {
  // ponytail: 仅预生成前 100 条已发布 slug;超出由 dynamicParams(默认 true)按需生成。量级增大再改分页遍历。
  const params: { locale: string; slug: string }[] = []
  for (const locale of locales) {
    const res = await getNews(locale, { limit: 100 }).catch(() => null)
    for (const n of res?.docs ?? []) params.push({ locale, slug: n.slug })
  }
  return params
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}) {
  const { locale: raw, slug } = await params
  const locale = isLocale(raw) ? raw : 'zh'
  const doc = await getNewsBySlug(slug, locale).catch(() => null)
  return { title: doc?.title, description: doc?.excerpt }
}

export default async function NewsDetail({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}) {
  const { locale: raw, slug } = await params
  const locale = isLocale(raw) ? raw : 'zh'
  const dict = getDict(locale)
  const doc = await getNewsBySlug(slug, locale).catch(() => null)
  if (!doc) notFound()

  const date = doc.publishedAt
    ? new Intl.DateTimeFormat(locale === 'zh' ? 'zh-CN' : 'en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(new Date(doc.publishedAt))
    : ''
  const related = await getRelatedNews(doc, locale).catch(() => [])

  return (
    <article className="detail">
      <header className="page-header reveal">
        {date && <span className="idx mono">{date}</span>}
        <h1>{doc.title}</h1>
      </header>

      {doc.cover && (
        <section className="section detail-media">
          <Media media={doc.cover} variant="hero" priority sizes="100vw" />
        </section>
      )}

      <section className="section prose">
        <RichText data={doc.body} />
      </section>

      {related.length > 0 && (
        <section className="section">
          <div className="section-head">
            <span className="idx mono">{dict.labels.relatedNews}</span>
          </div>
          <div className="grid grid-3">
            {related.map((n) => (
              <NewsCard key={n.id} doc={n} locale={locale} />
            ))}
          </div>
        </section>
      )}
    </article>
  )
}
