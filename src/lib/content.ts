import type { Locale } from '@/i18n/config'
import type { About, Case, Contact, Home, News, Service } from '@/payload-types'

import { findPublished, findPublishedBySlug, getPublicGlobal } from './payload'

// 页面级取数(§11)。4a 仅公开分支;4b 会在此按 draftMode 切换预览分支——集中一处便于加鉴权门。
// 列表 depth:1(封面/关系够用),详情/全局 depth:2(populate 关系里的封面)。

const LIST = 1
const DETAIL = 2

export const getHome = (locale: Locale) => getPublicGlobal('home', locale, DETAIL) as Promise<Home>
export const getAbout = (locale: Locale) => getPublicGlobal('about', locale, LIST) as Promise<About>
export const getContact = (locale: Locale) =>
  getPublicGlobal('contact', locale, LIST) as Promise<Contact>

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
  findPublishedBySlug('cases', slug, locale) as Promise<Case | null>
export const getServiceBySlug = (slug: string, locale: Locale) =>
  findPublishedBySlug('services', slug, locale) as Promise<Service | null>
export const getNewsBySlug = (slug: string, locale: Locale) =>
  findPublishedBySlug('news', slug, locale) as Promise<News | null>

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
