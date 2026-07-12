import { notFound } from 'next/navigation'

import { CaseCard } from '@/components/cards'
import Media from '@/components/Media'
import PageHeader from '@/components/PageHeader'
import RichText from '@/components/RichText'
import { getDict, isLocale, locales } from '@/i18n'
import { getCasesForService, getServiceBySlug, getServices } from '@/lib/content'

export const revalidate = 60

export async function generateStaticParams() {
  // ponytail: 仅预生成前 100 条已发布 slug;超出由 dynamicParams(默认 true)按需生成。量级增大再改分页遍历。
  const params: { locale: string; slug: string }[] = []
  for (const locale of locales) {
    const res = await getServices(locale, { limit: 100 }).catch(() => null)
    for (const s of res?.docs ?? []) params.push({ locale, slug: s.slug })
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
  const doc = await getServiceBySlug(slug, locale).catch(() => null)
  return { title: doc?.title, description: doc?.summary }
}

export default async function ServiceDetail({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}) {
  const { locale: raw, slug } = await params
  const locale = isLocale(raw) ? raw : 'zh'
  const dict = getDict(locale)
  const doc = await getServiceBySlug(slug, locale).catch(() => null)
  if (!doc) notFound()

  const cases = await getCasesForService(doc.id, locale).catch(() => [])

  return (
    <article className="detail">
      <PageHeader title={doc.title} idx={dict.pages.services.idx} lede={doc.summary} />

      {doc.cover && (
        <section className="section detail-media">
          <Media media={doc.cover} variant="hero" priority sizes="100vw" />
        </section>
      )}

      <section className="section prose">
        <RichText data={doc.detail} />
      </section>

      {cases.length > 0 && (
        <section className="section">
          <div className="section-head">
            <span className="idx mono">{dict.sections.work}</span>
          </div>
          <div className="grid grid-3">
            {cases.map((c) => (
              <CaseCard key={c.id} doc={c} locale={locale} />
            ))}
          </div>
        </section>
      )}
    </article>
  )
}
