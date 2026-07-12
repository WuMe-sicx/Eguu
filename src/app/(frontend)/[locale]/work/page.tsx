import { CaseCard } from '@/components/cards'
import PageHeader from '@/components/PageHeader'
import { getDict, isLocale } from '@/i18n'
import { getCases } from '@/lib/content'

export const revalidate = 60

export default async function WorkPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params
  const locale = isLocale(raw) ? raw : 'zh'
  const dict = getDict(locale)
  const p = dict.pages.work
  const cases = (await getCases(locale, { limit: 24 }).catch(() => null))?.docs ?? []

  return (
    <>
      <PageHeader title={p.title} idx={p.idx} />
      <section className="section">
        {cases.length > 0 ? (
          <div className="grid grid-3">
            {cases.map((c) => (
              <CaseCard key={c.id} doc={c} locale={locale} />
            ))}
          </div>
        ) : (
          <p className="placeholder">{dict.labels.empty}</p>
        )}
      </section>
    </>
  )
}
