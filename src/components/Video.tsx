import type { Case, Media as MediaDoc } from '@/payload-types'

import { isAllowedVideoId } from '@/lib/validators'

// 白名单平台 → iframe src 构造器(只用已校验 ID 拼 URL,绝不渲染任意 embed HTML)。
const EMBED_SRC: Record<'tencent' | 'bilibili', (id: string) => string> = {
  tencent: (id) => `https://v.qq.com/txp/iframe/player.html?vid=${encodeURIComponent(id)}`,
  bilibili: (id) =>
    id.startsWith('av')
      ? `https://player.bilibili.com/player.html?aid=${encodeURIComponent(id.slice(2))}`
      : `https://player.bilibili.com/player.html?bvid=${encodeURIComponent(id)}`,
}

type Props = {
  videoType?: Case['videoType']
  videoFile?: Case['videoFile']
  videoEmbed?: Case['videoEmbed']
  poster?: number | MediaDoc | null
}

// 案例视频:自托管 <video>(懒加载 + poster)或白名单平台 iframe。
export default function Video({ videoType, videoFile, videoEmbed, poster }: Props) {
  if (videoType === 'selfHosted') {
    if (!videoFile || typeof videoFile !== 'object' || !videoFile.url) return null
    const posterUrl = poster && typeof poster === 'object' ? (poster.url ?? undefined) : undefined
    return (
      <video
        className="case-video"
        src={videoFile.url}
        poster={posterUrl}
        controls
        preload="none"
        playsInline
      />
    )
  }

  if (videoType === 'embed') {
    const provider = videoEmbed?.provider
    const id = videoEmbed?.videoId
    // 渲染前二次校验(纵深防御:即便入库校验被绕过,前台也不拼非法 ID)
    if (!provider || !id || !isAllowedVideoId(provider, id)) return null
    return (
      <div className="case-video-embed">
        <iframe
          src={EMBED_SRC[provider](id)}
          title="video"
          allow="fullscreen; encrypted-media"
          allowFullScreen
          loading="lazy"
        />
      </div>
    )
  }

  return null
}
