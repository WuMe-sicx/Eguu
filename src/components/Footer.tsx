import Link from 'next/link'

import type { Dict, Locale } from '@/i18n'
import type { SiteSetting } from '@/payload-types'

const NAV_ITEMS = ['work', 'services', 'about', 'news', 'contact'] as const

export default function Footer({
  locale,
  dict,
  settings,
}: {
  locale: Locale
  dict: Dict
  settings: SiteSetting | null
}) {
  const brand = settings?.siteName || dict.brand.name
  const icp = settings?.footer?.icp
  const publicSecurity = settings?.footer?.publicSecurity

  return (
    <footer className="site-footer">
      <div>
        <div className="fbrand">{brand}</div>
        <p style={{ color: 'var(--fg-muted)', maxWidth: '34ch', margin: '14px 0 0' }}>
          {settings?.footer?.text || dict.footer.tagline}
        </p>
      </div>
      <div>
        <h4>{dict.footer.nav}</h4>
        {NAV_ITEMS.map((k) => (
          <Link key={k} href={`/${locale}/${k}`}>
            {dict.nav[k]}
          </Link>
        ))}
      </div>
      <div>
        <h4>{dict.footer.contact}</h4>
        <Link href={`/${locale}/contact`}>{dict.nav.contact}</Link>
        <Link href={`/${locale}/privacy`}>{dict.footer.privacy}</Link>
      </div>
      <div className="legal">
        {icp ? <span>{icp}</span> : null}
        {publicSecurity ? <span>{publicSecurity}</span> : null}
        <span>
          © {new Date().getFullYear()} {brand} · {dict.footer.rights}
        </span>
      </div>
    </footer>
  )
}
