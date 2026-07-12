import { getPayload, type DataFromGlobalSlug, type GlobalSlug, type Payload, type Where } from 'payload'

import config from '@/payload.config'
import type { Locale } from '@/i18n/config'

// 单进程直连 Local API(§11)。缓存实例避免每请求重复 init。
let cached: Promise<Payload> | null = null
export const getPayloadClient = (): Promise<Payload> => (cached ??= getPayload({ config }))

// 有草稿的公开内容集合
type PublicCollection = 'cases' | 'services' | 'news'

type FindOpts = { where?: Where; limit?: number; page?: number; sort?: string; depth?: number }

const withPublished = (where?: Where): Where =>
  where ? { and: [{ _status: { equals: 'published' } }, where] } : { _status: { equals: 'published' } }

/**
 * §11 分支①:公开集合。draft:false + overrideAccess:false + 显式 _status:published。
 * Local API 默认 overrideAccess:true 会越过 access,这里必须显式关掉并加 published 条件,防草稿外泄。
 */
export async function findPublished(collection: PublicCollection, locale: Locale, opts: FindOpts = {}) {
  const payload = await getPayloadClient()
  return payload.find({
    collection,
    locale,
    draft: false,
    overrideAccess: false,
    depth: opts.depth ?? 1,
    limit: opts.limit,
    page: opts.page,
    sort: opts.sort,
    where: withPublished(opts.where),
  })
}

export async function findPublishedBySlug(collection: PublicCollection, slug: string, locale: Locale) {
  const res = await findPublished(collection, locale, { where: { slug: { equals: slug } }, limit: 1 })
  return res.docs[0] ?? null
}

/** §11 分支②:公开全局。draft:false + overrideAccess:false(由 global access 控制,globals 不支持 where)。 */
export async function getPublicGlobal<T extends GlobalSlug>(
  slug: T,
  locale: Locale,
  depth = 1,
): Promise<DataFromGlobalSlug<T>> {
  const payload = await getPayloadClient()
  return payload.findGlobal({ slug, locale, draft: false, overrideAccess: false, depth })
}

/**
 * §11 分支③:预览集合(调用前须已通过 §18 鉴权建立 draftMode)。
 * draft:true + overrideAccess:true,**不加 published 条件**(否则未发布新草稿被过滤 → 预览 404)。
 * 阶段 4 接入草稿预览时使用。
 */
export async function findPreview(collection: PublicCollection, locale: Locale, opts: FindOpts = {}) {
  const payload = await getPayloadClient()
  return payload.find({
    collection,
    locale,
    draft: true,
    overrideAccess: true,
    depth: opts.depth ?? 1,
    limit: opts.limit,
    page: opts.page,
    sort: opts.sort,
    where: opts.where,
  })
}

/** §11 分支④:预览全局。draft:true + overrideAccess:true。 */
export async function getPreviewGlobal<T extends GlobalSlug>(
  slug: T,
  locale: Locale,
  depth = 1,
): Promise<DataFromGlobalSlug<T>> {
  const payload = await getPayloadClient()
  return payload.findGlobal({ slug, locale, draft: true, overrideAccess: true, depth })
}
