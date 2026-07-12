import { notFound } from 'next/navigation'

import '../globals.css'
import Footer from '@/components/Footer'
import Nav from '@/components/Nav'
import RevealObserver from '@/components/RevealObserver'
import { getDict, isLocale, locales } from '@/i18n'
import { getPublicGlobal } from '@/lib/payload'

// 无闪主题:进入前从 localStorage 应用手动覆盖(系统偏好由 CSS @media 处理)
const themeInit = `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||t==='light')document.documentElement.setAttribute('data-theme',t)}catch(e){}})()`

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const dict = getDict(isLocale(locale) ? locale : 'zh')
  return { title: `${dict.brand.name} · ${dict.brand.sub}` }
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const dict = getDict(locale)

  // 站点配置(品牌名/备案号)。DB 不可用时回退 i18n,骨架仍可渲染。
  const settings = await getPublicGlobal('site-settings', locale).catch(() => null)
  const brand = { name: settings?.siteName || dict.brand.name, sub: dict.brand.sub }

  return (
    <html lang={locale} suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
        <div className="grain" aria-hidden="true" />
        <Nav locale={locale} brand={brand} labels={dict.nav} a11y={dict.a11y} />
        <RevealObserver />
        <main id="top">{children}</main>
        <Footer locale={locale} dict={dict} settings={settings} />
      </body>
    </html>
  )
}
