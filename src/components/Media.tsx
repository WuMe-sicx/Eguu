import Image from 'next/image'

import type { Media as MediaDoc } from '@/payload-types'

type UploadValue = number | MediaDoc | null | undefined

type Props = {
  media: UploadValue
  variant?: 'thumbnail' | 'card' | 'hero'
  className?: string
  sizes?: string
  priority?: boolean
  fill?: boolean
}

// next/image 封装 Payload upload。null 安全:无图/未 populate(depth 不足=number)返回 null,页面不崩。
export default function Media({ media, variant, className, sizes, priority, fill }: Props) {
  if (!media || typeof media !== 'object') return null

  const size = variant ? media.sizes?.[variant] : undefined
  const url = size?.url || media.url
  if (!url) return null

  const alt = media.alt || ''
  if (fill) {
    return <Image src={url} alt={alt} fill className={className} sizes={sizes} priority={priority} />
  }

  const width = size?.width || media.width
  const height = size?.height || media.height
  if (!width || !height) return null
  return (
    <Image
      src={url}
      alt={alt}
      width={width}
      height={height}
      className={className}
      sizes={sizes}
      priority={priority}
    />
  )
}
