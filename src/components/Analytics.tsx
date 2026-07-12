import Script from 'next/script'

import { isAllowedAnalyticsId } from '@/lib/validators'
import type { SiteSetting } from '@/payload-types'

// 统计脚本注入(§12):只按结构化 provider+ID 生成**固定脚本**,绝不渲染任意 HTML/JS。
// ID 渲染前再校验一次(纵深):非法/none → 不注入。ID 已过严格字符白名单
// (baidu 32hex / GA G-[A-Z0-9]+ / umami UUID),故内联脚本里的插值不含可断脚本字符,无注入面。
export default function Analytics({ analytics }: { analytics?: SiteSetting['analytics'] }) {
  const provider = analytics?.provider
  const id = analytics?.measurementId
  if (!provider || provider === 'none' || !isAllowedAnalyticsId(provider, id)) return null

  if (provider === 'baidu') {
    return <Script id="a-baidu" strategy="afterInteractive" src={`https://hm.baidu.com/hm.js?${id}`} />
  }

  if (provider === 'google') {
    return (
      <>
        <Script src={`https://www.googletagmanager.com/gtag/js?id=${id}`} strategy="afterInteractive" />
        <Script id="a-gtag" strategy="afterInteractive">
          {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${id}');`}
        </Script>
      </>
    )
  }

  if (provider === 'umami') {
    // 默认走 umami 云;自托管改 src 到自有域(阶段7 随部署配置)。
    return (
      <Script
        id="a-umami"
        strategy="afterInteractive"
        src="https://cloud.umami.is/script.js"
        data-website-id={id}
      />
    )
  }

  return null
}
