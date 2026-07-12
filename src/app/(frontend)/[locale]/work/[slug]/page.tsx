import Link from 'next/link'
import { notFound } from 'next/navigation'

import { CaseCard } from '@/components/cards'
import { CaseJsonLd } from '@/components/JsonLd'
import Media from '@/components/Media'
import RichText from '@/components/RichText'
import Video from '@/components/Video'
import { getDict, isLocale, locales } from '@/i18n'
import { getCaseBySlug, getCases, getRelatedCases } from '@/lib/content'
import { buildMetadata, getCachedSettings } from '@/lib/seo'
import type { Media as MediaDoc, Service } from '@/payload-types'

export const revalidate = 60

export async function generateStaticParams() {
  // ponytail: 仅预生成前 100 条已发布 slug;超出由 dynamicParams(默认 true)按需生成。量级增大再改分页遍历。
  const params: { locale: string; slug: string }[] = []
  for (const locale of locales) {
    const res = await getCases(locale, { limit: 100 }).catch(() => null)
    for (const c of res?.docs ?? []) params.push({ locale, slug: c.slug })
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
  const doc = await getCaseBySlug(slug, locale).catch(() => null)
  if (!doc) return {}
  return buildMetadata({
    locale,
    path: `/work/${slug}`,
    type: 'article',
    title: doc.meta?.title || doc.title,
    description: doc.meta?.description || doc.client,
    image: doc.meta?.image ?? doc.cover,
    settings: await getCachedSettings(locale),
  })
}

export default async function CaseDetail({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}) {
  const { locale: raw, slug } = await params
  const locale = isLocale(raw) ? raw : 'zh'
  const dict = getDict(locale)
  const doc = await getCaseBySlug(slug, locale).catch(() => null)
  if (!doc) notFound()

  const services = (doc.services ?? []).filter((s) => typeof s === 'object') as Service[]
  const gallery = (doc.gallery ?? []).filter((g) => typeof g === 'object') as MediaDoc[]
  const related = await getRelatedCases(doc, locale).catch(() => [])

  return (
    <article className="detail">
      <CaseJsonLd doc={doc} locale={locale} />
      <header className="page-header reveal">
        <span className="idx mono">{doc.client}</span>
        <h1>{doc.title}</h1>
        {services.length > 0 && (
          <div className="tags">
            {services.map((s) => (
              <Link key={s.id} href={`/${locale}/services/${s.slug}`} className="tag mono">
                {s.title}
              </Link>
            ))}
          </div>
        )}
      </header>

      {doc.videoType ? (
        <section className="section detail-media">
          <Video
            videoType={doc.videoType}
            videoFile={doc.videoFile}
            videoEmbed={doc.videoEmbed}
            poster={doc.cover}
          />
        </section>
      ) : (
        doc.cover && (
          <section className="section detail-media">
            <Media media={doc.cover} variant="hero" priority sizes="100vw" />
          </section>
        )
      )}

      <section className="section prose">
        <RichText data={doc.intro} />
      </section>

      {gallery.length > 0 && (
        <section className="section">
          <div className="gallery">
            {gallery.map((g) => (
              <Media key={g.id} media={g} variant="hero" sizes="(max-width: 820px) 100vw, 50vw" />
            ))}
          </div>
        </section>
      )}

      {related.length > 0 && (
        <section className="section">
          <div className="section-head">
            <span className="idx mono">{dict.labels.related}</span>
          </div>
          <div className="grid grid-3">
            {related.map((c) => (
              <CaseCard key={c.id} doc={c} locale={locale} />
            ))}
          </div>
        </section>
      )}
    </article>
  )
}
