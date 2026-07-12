import { NewsCard } from '@/components/cards'
import PageHeader from '@/components/PageHeader'
import { getDict, isLocale } from '@/i18n'
import { getNews } from '@/lib/content'

export const revalidate = 60

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
