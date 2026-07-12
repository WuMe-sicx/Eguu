'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

import type { Dict, Locale } from '@/i18n'

type Props = {
  locale: Locale
  brand: { name: string; sub: string }
  labels: Dict['nav']
  a11y: Dict['a11y']
}

const NAV_ITEMS = ['work', 'services', 'about', 'news', 'contact'] as const

const currentIsDark = () => {
  const t = document.documentElement.getAttribute('data-theme')
  if (t) return t === 'dark'
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

const swapLocale = (pathname: string, from: Locale, to: Locale) => {
  if (pathname === `/${from}`) return `/${to}`
  if (pathname.startsWith(`/${from}/`)) return `/${to}${pathname.slice(from.length + 1)}`
  return `/${to}`
}

export default function Nav({ locale, brand, labels, a11y }: Props) {
  const pathname = usePathname()
  // 只有首页有深色 hero:透明→滚动转实底;其余页直接实底
  const overHero = pathname === `/${locale}`
  const [solid, setSolid] = useState(!overHero)
  const [menuOpen, setMenuOpen] = useState(false)
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    setIsDark(currentIsDark())
    if (!overHero) {
      setSolid(true)
      return
    }
    const onScroll = () => setSolid(window.scrollY > window.innerHeight * 0.72)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [overHero])

  const other: Locale = locale === 'zh' ? 'en' : 'zh'
  const toggleTheme = () => {
    const next = currentIsDark() ? 'light' : 'dark'
    document.documentElement.setAttribute('data-theme', next)
    try {
      localStorage.setItem('theme', next)
    } catch {
      /* localStorage 不可用则仅当次会话生效 */
    }
    setIsDark(next === 'dark')
  }

  return (
    <nav className={solid ? 'site-nav solid' : 'site-nav'}>
      <Link href={`/${locale}`} className="brand" aria-label={a11y.home}>
        <span className="mk" aria-hidden="true" />
        <span>
          {brand.name}
          <small>{brand.sub}</small>
        </span>
      </Link>

      <div className={menuOpen ? 'navlinks open' : 'navlinks'}>
        {NAV_ITEMS.map((key) => (
          <Link key={key} href={`/${locale}/${key}`} onClick={() => setMenuOpen(false)}>
            {labels[key]}
          </Link>
        ))}
      </div>

      <div className="navtools">
        <Link href={swapLocale(pathname, locale, other)} className="lang mono" aria-label={a11y.switchLang}>
          <b>{locale === 'zh' ? '中' : 'EN'}</b> / {locale === 'zh' ? 'EN' : '中'}
        </Link>
        <button
          type="button"
          className="theme-btn"
          onClick={toggleTheme}
          aria-pressed={isDark}
          aria-label={isDark ? a11y.toThemeLight : a11y.toThemeDark}
        >
          ◐
        </button>
        <button
          type="button"
          className="menu-btn"
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
          aria-label={menuOpen ? labels.close : labels.menu}
        >
          {menuOpen ? '✕' : '☰'}
        </button>
      </div>
    </nav>
  )
}
