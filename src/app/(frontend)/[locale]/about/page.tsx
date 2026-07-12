import Media from '@/components/Media'
import PageHeader from '@/components/PageHeader'
import RichText from '@/components/RichText'
import { getDict, isLocale } from '@/i18n'
import { getAbout } from '@/lib/content'

export const revalidate = 60

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params
  const locale = isLocale(raw) ? raw : 'zh'
  const dict = getDict(locale)
  const p = dict.pages.about

  const about = await getAbout(locale).catch(() => null)
  const team = about?.team ?? []
  const clients = about?.clients ?? []
  const awards = about?.awards ?? []

  return (
    <>
      <PageHeader title={p.title} idx={p.idx} />

      {about?.intro && (
        <section className="section prose lede">
          <RichText data={about.intro} />
        </section>
      )}

      {team.length > 0 && (
        <section className="section">
          <div className="section-head">
            <span className="idx mono">{dict.labels.team}</span>
          </div>
          <div className="grid grid-3">
            {team.map((m, i) => (
              <div key={m.id ?? i} className="member reveal">
                <div className="member-avatar">
                  <Media media={m.avatar} variant="card" sizes="240px" />
                </div>
                <h3 className="card-title">{m.name}</h3>
                {m.role && <span className="card-meta mono">{m.role}</span>}
                {m.bio && <p className="card-sub">{m.bio}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {clients.length > 0 && (
        <section className="section">
          <div className="section-head">
            <span className="idx mono">{dict.labels.clients}</span>
          </div>
          <div className="clients-wall">
            {clients.map((c, i) => (
              <div key={c.id ?? i} className="client-logo" title={c.name}>
                {c.logo ? (
                  <Media media={c.logo} variant="thumbnail" sizes="160px" />
                ) : (
                  <span className="mono">{c.name}</span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {awards.length > 0 && (
        <section className="section">
          <div className="section-head">
            <span className="idx mono">{dict.labels.awards}</span>
          </div>
          <ul className="awards">
            {awards.map((a, i) => (
              <li key={a.id ?? i} className="award reveal">
                {a.year && <span className="mono award-year">{a.year}</span>}
                <div>
                  <h3 className="card-title">{a.title}</h3>
                  {a.description && <p className="card-sub">{a.description}</p>}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  )
}
