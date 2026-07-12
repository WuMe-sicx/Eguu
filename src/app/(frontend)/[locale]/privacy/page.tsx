import { getPrivacy } from '@/content/privacy'
import PageHeader from '@/components/PageHeader'
import { getDict, isLocale } from '@/i18n'
import { buildMetadata, getCachedSettings } from '@/lib/seo'

export const revalidate = 3600

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params
  const locale = isLocale(raw) ? raw : 'zh'
  const dict = getDict(locale)
  return buildMetadata({
    locale,
    path: '/privacy',
    title: dict.pages.privacy.title,
    fallbackDescription: dict.seo.privacy,
    settings: await getCachedSettings(locale),
  })
}

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params
  const locale = isLocale(raw) ? raw : 'zh'
  const dict = getDict(locale)
  const p = dict.pages.privacy
  const content = getPrivacy(locale)

  return (
    <>
      <PageHeader title={p.title} idx={p.idx} />
      <section className="section legal-doc">
        <p className="legal-updated mono">{content.updated}</p>
        <p className="legal-notice">{content.notice}</p>
        {content.sections.map((s, i) => (
          <div key={i} className="legal-section">
            <h2>{s.heading}</h2>
            {s.body.map((para, j) => (
              <p key={j}>{para}</p>
            ))}
          </div>
        ))}
      </section>
    </>
  )
}
