import { draftMode, headers } from 'next/headers'

import type { Locale } from '@/i18n/config'
import type { About, Case, Contact, Home, News, Service } from '@/payload-types'

import {
  findPreview,
  findPublished,
  findPublishedBySlug,
  getPayloadClient,
  getPreviewGlobal,
  getPublicGlobal,
} from './payload'

// 页面级取数(§11)。详情/全局 helper 按 draftMode 切换公开↔预览分支(§18)。
// ⚠️ 列表 helper 保持公开:generateStaticParams 在构建期无请求上下文,不能调 draftMode()。
// 列表 depth:1(封面/关系够用),详情/全局 depth:2(populate 关系里的封面)。

const LIST = 1
const DETAIL = 2

// 走预览分支的条件(§18 唯一不变量:草稿只对活跃的登录管理员可见):
// 1) 请求带 draftMode cookie;且 2) 当前 Payload 会话仍是 admin/editor。
// draftMode cookie 只是每次构建的全局 bearer,不绑定身份——若只认它,登出/降权/cookie 重放仍能读草稿,
// 故每次草稿读取都要重新校验会话。draftMode 关闭时(含构建期 generateStaticParams)提前返回,不触发鉴权、公开页仍 SSG。
async function inPreview(): Promise<boolean> {
  const { isEnabled } = await draftMode()
  if (!isEnabled) return false
  try {
    const payload = await getPayloadClient()
    const { user } = await payload.auth({ headers: await headers() })
    const roles = (user as { roles?: string[] } | null)?.roles ?? []
    return roles.includes('admin') || roles.includes('editor')
  } catch {
    return false
  }
}

type PublicCollection = 'cases' | 'services' | 'news'

async function getOneBySlug(
  collection: PublicCollection,
  slug: string,
  locale: Locale,
): Promise<unknown> {
  if (await inPreview()) {
    const res = await findPreview(collection, locale, {
      where: { slug: { equals: slug } },
      limit: 1,
      depth: LIST,
    })
    return res.docs[0] ?? null
  }
  return findPublishedBySlug(collection, slug, locale)
}

export async function getHome(locale: Locale): Promise<Home> {
  return ((await inPreview())
    ? getPreviewGlobal('home', locale, DETAIL)
    : getPublicGlobal('home', locale, DETAIL)) as Promise<Home>
}
export async function getAbout(locale: Locale): Promise<About> {
  return ((await inPreview())
    ? getPreviewGlobal('about', locale, LIST)
    : getPublicGlobal('about', locale, LIST)) as Promise<About>
}
export async function getContact(locale: Locale): Promise<Contact> {
  return ((await inPreview())
    ? getPreviewGlobal('contact', locale, LIST)
    : getPublicGlobal('contact', locale, LIST)) as Promise<Contact>
}

type ListOpts = { limit?: number; page?: number }

export async function getCases(locale: Locale, opts: ListOpts = {}) {
  const res = await findPublished('cases', locale, { sort: '_order', depth: LIST, ...opts })
  return { ...res, docs: res.docs as unknown as Case[] }
}
export async function getServices(locale: Locale, opts: ListOpts = {}) {
  const res = await findPublished('services', locale, { sort: '_order', depth: LIST, ...opts })
  return { ...res, docs: res.docs as unknown as Service[] }
}
export async function getNews(locale: Locale, opts: ListOpts = {}) {
  const res = await findPublished('news', locale, { sort: '-publishedAt', depth: LIST, ...opts })
  return { ...res, docs: res.docs as unknown as News[] }
}

export const getCaseBySlug = (slug: string, locale: Locale) =>
  getOneBySlug('cases', slug, locale) as Promise<Case | null>
export const getServiceBySlug = (slug: string, locale: Locale) =>
  getOneBySlug('services', slug, locale) as Promise<Service | null>
export const getNewsBySlug = (slug: string, locale: Locale) =>
  getOneBySlug('news', slug, locale) as Promise<News | null>

// 相关案例:与当前案例共享任一 service 的其他已发布案例。
export async function getRelatedCases(current: Case, locale: Locale, limit = 3): Promise<Case[]> {
  const serviceIds = (current.services ?? []).map((s) => (typeof s === 'object' ? s.id : s))
  if (serviceIds.length === 0) return []
  const res = await findPublished('cases', locale, {
    depth: LIST,
    limit,
    sort: '_order',
    where: { and: [{ services: { in: serviceIds } }, { id: { not_equals: current.id } }] },
  })
  return res.docs as unknown as Case[]
}

// 某服务下的已发布案例(服务详情页用)。
export async function getCasesForService(serviceId: number, locale: Locale, limit = 6): Promise<Case[]> {
  const res = await findPublished('cases', locale, {
    depth: LIST,
    limit,
    sort: '_order',
    where: { services: { in: [serviceId] } },
  })
  return res.docs as unknown as Case[]
}

// 相关新闻:最新的其他已发布新闻(简单按时间,避免额外分类字段)。
export async function getRelatedNews(current: News, locale: Locale, limit = 3): Promise<News[]> {
  const res = await findPublished('news', locale, {
    sort: '-publishedAt',
    limit,
    depth: LIST,
    where: { id: { not_equals: current.id } },
  })
  return res.docs as unknown as News[]
}
