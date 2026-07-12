import PageHeader from '@/components/PageHeader'
import { getDict, isLocale } from '@/i18n'
import { getContact, getServices } from '@/lib/content'
import { buildMetadata, getCachedSettings } from '@/lib/seo'
import type { Contact } from '@/payload-types'

import ContactForm from './ContactForm'

export const revalidate = 60

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params
  const locale = isLocale(raw) ? raw : 'zh'
  const dict = getDict(locale)
  return buildMetadata({
    locale,
    path: '/contact',
    title: dict.pages.contact.title,
    fallbackDescription: dict.seo.contact,
    settings: await getCachedSettings(locale),
  })
}

// 结构化坐标 → 地图深链(数字拼接,不嵌任意 HTML)
function mapUrl(map: Contact['map']): string | null {
  if (!map?.provider) return null
  const { lat, lng, provider } = map
  // 用 Number.isFinite + 经纬度范围校验(允许合法的 0,拒 NaN/无穷/越界)
  if (
    typeof lat !== 'number' ||
    typeof lng !== 'number' ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return null
  }
  if (provider === 'amap') return `https://uri.amap.com/marker?position=${lng},${lat}`
  if (provider === 'baidu') return `https://api.map.baidu.com/marker?location=${lat},${lng}&output=html`
  if (provider === 'tencent') return `https://apis.map.qq.com/uri/v1/marker?marker=coord:${lat},${lng}`
  return null
}

const isHttp = (u: string) => u.startsWith('http://') || u.startsWith('https://')

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params
  const locale = isLocale(raw) ? raw : 'zh'
  const dict = getDict(locale)
  const p = dict.pages.contact
  const L = dict.labels

  const contact = await getContact(locale).catch(() => null)
  const map = mapUrl(contact?.map)
  const social = (contact?.social ?? []).filter((s) => isHttp(s.url))

  const services = await getServices(locale, { limit: 100 }).catch(() => ({ docs: [] }))
  const serviceOptions = services.docs
    .filter((s) => typeof s.title === 'string' && s.title.length > 0)
    .map((s) => ({ id: s.id, title: s.title as string }))

  return (
    <>
      <PageHeader title={p.title} idx={p.idx} />
      <section className="section contact-grid">
        <div className="contact-list">
          {contact?.email && (
            <a className="contact-item" href={`mailto:${contact.email}`}>
              <span className="card-meta mono">{L.email}</span>
              <span className="contact-val">{contact.email}</span>
            </a>
          )}
          {contact?.phone && (
            <a className="contact-item" href={`tel:${contact.phone}`}>
              <span className="card-meta mono">{L.phone}</span>
              <span className="contact-val">{contact.phone}</span>
            </a>
          )}
          {contact?.address && (
            <div className="contact-item">
              <span className="card-meta mono">{L.address}</span>
              <span className="contact-val">{contact.address}</span>
              {map && (
                <a href={map} target="_blank" rel="noopener noreferrer" className="link-more mono">
                  {L.viewMap} →
                </a>
              )}
            </div>
          )}
          {social.length > 0 && (
            <div className="contact-item">
              <span className="card-meta mono">{L.follow}</span>
              <div className="social">
                {social.map((s, i) => (
                  <a key={s.id ?? i} href={s.url} target="_blank" rel="noopener noreferrer">
                    {s.platform}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="contact-form-wrap">
          <h2 className="card-meta mono">{p.form.heading}</h2>
          <ContactForm locale={locale} services={serviceOptions} t={p.form} />
        </div>
      </section>
    </>
  )
}
