import { NewsCard } from '@/components/cards'
import PageHeader from '@/components/PageHeader'
import { getDict, isLocale } from '@/i18n'
import { getNews } from '@/lib/content'
import { buildMetadata, getCachedSettings } from '@/lib/seo'

export const revalidate = 60

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params
  const locale = isLocale(raw) ? raw : 'zh'
  const dict = getDict(locale)
  return buildMetadata({
    locale,
    path: '/news',
    title: dict.pages.news.title,
    fallbackDescription: dict.seo.news,
    settings: await getCachedSettings(locale),
  })
}

export default async function NewsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params
  const locale = isLocale(raw) ? raw : 'zh'
  const dict = getDict(locale)
  const p = dict.pages.news
  const news = (await getNews(locale, { limit: 24 }).catch(() => null))?.docs ?? []

  return (
    <>
      <PageHeader title={p.title} idx={p.idx} />
      <section className="section">
        {news.length > 0 ? (
          <div className="grid grid-3">
            {news.map((n) => (
              <NewsCard key={n.id} doc={n} locale={locale} />
            ))}
          </div>
        ) : (
          <p className="placeholder">{dict.labels.empty}</p>
        )}
      </section>
    </>
  )
}
