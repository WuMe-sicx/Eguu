import Link from 'next/link'

import type { Locale } from '@/i18n/config'
import type { Case, News, Service } from '@/payload-types'

import Media from './Media'

const CARD_SIZES = '(max-width: 820px) 100vw, (max-width: 1200px) 50vw, 33vw'

const fmtDate = (iso: string | null | undefined, locale: Locale) =>
  iso
    ? new Intl.DateTimeFormat(locale === 'zh' ? 'zh-CN' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }).format(new Date(iso))
    : ''

export function CaseCard({ doc, locale }: { doc: Case; locale: Locale }) {
  const services = (doc.services ?? []).filter((s) => typeof s === 'object') as Service[]
  return (
    <Link href={`/${locale}/work/${doc.slug}`} className="card reveal">
      <div className="card-media">
        <Media media={doc.cover} variant="card" sizes={CARD_SIZES} />
      </div>
      <div className="card-body">
        <span className="card-meta mono">{doc.client}</span>
        <h3 className="card-title">{doc.title}</h3>
        {services.length > 0 && (
          <div className="tags">
            {services.map((s) => (
              <span key={s.id} className="tag mono">
                {s.title}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  )
}

export function ServiceCard({ doc, locale }: { doc: Service; locale: Locale }) {
  return (
    <Link href={`/${locale}/services/${doc.slug}`} className="card reveal">
      <div className="card-media">
        <Media media={doc.cover || doc.icon} variant="card" sizes={CARD_SIZES} />
      </div>
      <div className="card-body">
        <h3 className="card-title">{doc.title}</h3>
        <p className="card-sub">{doc.summary}</p>
      </div>
    </Link>
  )
}

export function NewsCard({ doc, locale }: { doc: News; locale: Locale }) {
  const date = fmtDate(doc.publishedAt, locale)
  return (
    <Link href={`/${locale}/news/${doc.slug}`} className="card reveal">
      <div className="card-media">
        <Media media={doc.cover} variant="card" sizes={CARD_SIZES} />
      </div>
      <div className="card-body">
        {date && <span className="card-meta mono">{date}</span>}
        <h3 className="card-title">{doc.title}</h3>
        <p className="card-sub">{doc.excerpt}</p>
      </div>
    </Link>
  )
}
