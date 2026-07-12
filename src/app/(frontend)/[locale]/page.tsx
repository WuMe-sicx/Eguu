import Link from 'next/link'

import { CaseCard, NewsCard, ServiceCard } from '@/components/cards'
import RichText from '@/components/RichText'
import { getDict, isLocale } from '@/i18n'
import { getHome, getNews, getServices } from '@/lib/content'
import { buildMetadata, getCachedSettings } from '@/lib/seo'
import type { Case, Service } from '@/payload-types'

export const revalidate = 60

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params
  const locale = isLocale(raw) ? raw : 'zh'
  return buildMetadata({
    locale,
    path: '',
    fallbackDescription: getDict(locale).seo.home,
    settings: await getCachedSettings(locale),
  })
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params
  const locale = isLocale(raw) ? raw : 'zh'
  const dict = getDict(locale)
  const h = dict.pages.home

  const home = await getHome(locale).catch(() => null)
  const heroTitle = home?.hero?.title || h.slogan
  const heroSub = home?.hero?.subtitle || dict.footer.tagline

  const featuredCases = (home?.featuredCases ?? []).filter((c) => typeof c === 'object') as Case[]
  let services = (home?.featuredServices ?? []).filter((s) => typeof s === 'object') as Service[]
  if (services.length === 0)
    services = (await getServices(locale, { limit: 3 }).catch(() => null))?.docs ?? []
  const news = (await getNews(locale, { limit: 3 }).catch(() => null))?.docs ?? []

  const cta = home?.contactCta

  return (
    <>
      <section className="hero">
        <div className="reel" aria-hidden="true" />
        <div className="hero-inner">
          <div className="eyebrow mono">
            <span className="dot" />
            {h.eyebrow}
          </div>
          <h1 className="slogan">{heroTitle}</h1>
          <div className="kicker">{h.kicker}</div>
          <p className="sub">{heroSub}</p>
        </div>
        <div className="scrollcue mono" aria-hidden="true">
          <span>{dict.sections.work}</span>
          <span className="arrow">SCROLL ↓</span>
        </div>
      </section>

      {home?.intro && (
        <section className="section">
          <RichText data={home.intro} className="prose lede" />
        </section>
      )}

      {services.length > 0 && (
        <section className="section">
          <div className="section-head">
            <span className="idx mono">{dict.sections.services}</span>
          </div>
          <div className="grid grid-3">
            {services.map((s) => (
              <ServiceCard key={s.id} doc={s} locale={locale} />
            ))}
          </div>
        </section>
      )}

      {featuredCases.length > 0 && (
        <section className="section">
          <div className="section-head">
            <span className="idx mono">{dict.sections.work}</span>
            <Link href={`/${locale}/work`} className="link-more mono">
              {dict.labels.viewAll} →
            </Link>
          </div>
          <div className="grid grid-3">
            {featuredCases.map((c) => (
              <CaseCard key={c.id} doc={c} locale={locale} />
            ))}
          </div>
        </section>
      )}

      {news.length > 0 && (
        <section className="section">
          <div className="section-head">
            <span className="idx mono">{dict.sections.news}</span>
            <Link href={`/${locale}/news`} className="link-more mono">
              {dict.labels.viewAll} →
            </Link>
          </div>
          <div className="grid grid-3">
            {news.map((n) => (
              <NewsCard key={n.id} doc={n} locale={locale} />
            ))}
          </div>
        </section>
      )}

      <section className="cta-band reveal">
        <h2>{cta?.title || dict.pages.contact.title}</h2>
        <Link href={cta?.ctaHref || `/${locale}/contact`} className="btn">
          {cta?.ctaLabel || dict.nav.contact}
        </Link>
      </section>
    </>
  )
}
