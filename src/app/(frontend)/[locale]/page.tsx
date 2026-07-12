import { getDict, isLocale } from '@/i18n'

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const dict = getDict(isLocale(locale) ? locale : 'zh')
  const h = dict.pages.home

  return (
    <section className="hero">
      <div className="reel" aria-hidden="true" />
      <div className="hero-inner">
        <div className="eyebrow mono">
          <span className="dot" />
          {h.eyebrow}
        </div>
        <h1 className="slogan">{h.slogan}</h1>
        <div className="kicker">{h.kicker}</div>
        <p className="sub">{dict.footer.tagline}</p>
      </div>
      <div className="scrollcue mono" aria-hidden="true">
        <span>{dict.pages.work.idx}</span>
        <span className="arrow">SCROLL ↓</span>
      </div>
    </section>
  )
}
