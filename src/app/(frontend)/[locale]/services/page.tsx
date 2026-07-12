import { ServiceCard } from '@/components/cards'
import PageHeader from '@/components/PageHeader'
import { getDict, isLocale } from '@/i18n'
import { getServices } from '@/lib/content'
import { buildMetadata, getCachedSettings } from '@/lib/seo'

export const revalidate = 60

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params
  const locale = isLocale(raw) ? raw : 'zh'
  const dict = getDict(locale)
  return buildMetadata({
    locale,
    path: '/services',
    title: dict.pages.services.title,
    fallbackDescription: dict.seo.services,
    settings: await getCachedSettings(locale),
  })
}

export default async function ServicesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params
  const locale = isLocale(raw) ? raw : 'zh'
  const dict = getDict(locale)
  const p = dict.pages.services
  const services = (await getServices(locale, { limit: 24 }).catch(() => null))?.docs ?? []

  return (
    <>
      <PageHeader title={p.title} idx={p.idx} />
      <section className="section">
        {services.length > 0 ? (
          <div className="grid grid-3">
            {services.map((s) => (
              <ServiceCard key={s.id} doc={s} locale={locale} />
            ))}
          </div>
        ) : (
          <p className="placeholder">{dict.labels.empty}</p>
        )}
      </section>
    </>
  )
}
