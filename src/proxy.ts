import { NextResponse, type NextRequest } from 'next/server'

import { defaultLocale, locales } from './i18n/config'

// Next 16:middleware → proxy(nodejs runtime)。语言前缀识别:无前缀 → 重定向到默认 locale(§9)。
// matcher 已排除 admin/api/_next 与静态文件,此处只处理前台路由。
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  const hasLocale = locales.some((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`))
  if (hasLocale) return NextResponse.next()

  const url = req.nextUrl.clone()
  url.pathname = `/${defaultLocale}${pathname === '/' ? '' : pathname}`
  return NextResponse.redirect(url)
}

export const config = {
  // 排除 preview/exit-preview:草稿预览路由不走语言重定向(§18)
  matcher: ['/((?!api|admin|_next|preview|exit-preview|.*\\.).*)'],
}
