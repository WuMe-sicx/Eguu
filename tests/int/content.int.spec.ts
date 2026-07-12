// @vitest-environment node
// 阶段4a 页面级取数(src/lib/content.ts)回归:相关/服务筛选、排除自身、仅已发布、草稿不可见。
import { getPayload, type Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

import {
  getCaseBySlug,
  getCasesForService,
  getRelatedCases,
  getRelatedNews,
  getServices,
} from '@/lib/content'
import config from '@/payload.config'

let payload: Payload

const rt = (text: string) => ({
  root: {
    type: 'root',
    format: '' as const,
    indent: 0,
    version: 1,
    direction: 'ltr' as const,
    children: [
      {
        type: 'paragraph',
        format: '' as const,
        indent: 0,
        version: 1,
        direction: 'ltr' as const,
        children: [{ type: 'text', format: 0, style: '', mode: 'normal', detail: 0, version: 1, text }],
      },
    ],
  },
})

const S = {
  svcA: 'content-svc-a',
  svcB: 'content-svc-b',
  svcC: 'content-svc-c',
  svcDraft: 'content-svc-draft',
  caseX: 'content-case-x',
  caseY: 'content-case-y',
  caseZ: 'content-case-z',
  caseW: 'content-case-w',
  caseDraft: 'content-case-draft',
  newsA: 'content-news-a',
  newsB: 'content-news-b',
  newsDraft: 'content-news-draft',
}

// 建 zh 草稿 → 补 en → 发布(过双语门禁)
async function publish(
  collection: 'services' | 'cases' | 'news',
  common: Record<string, unknown>,
  zh: Record<string, unknown>,
  en: Record<string, unknown>,
) {
  const draft = await payload.create({
    collection,
    locale: 'zh',
    draft: true,
    data: { ...common, ...zh, _status: 'draft' },
  })
  await payload.update({ collection, id: draft.id, locale: 'en', draft: true, data: en })
  return payload.update({ collection, id: draft.id, locale: 'zh', data: { _status: 'published' } })
}

describe('阶段4a content 取数', () => {
  let svcAId: number
  let svcBId: number

  beforeAll(async () => {
    payload = await getPayload({ config })
    for (const [col, slugs] of [
      ['services', [S.svcA, S.svcB, S.svcC, S.svcDraft]],
      ['cases', [S.caseX, S.caseY, S.caseZ, S.caseW, S.caseDraft]],
      ['news', [S.newsA, S.newsB, S.newsDraft]],
    ] as const) {
      for (const slug of slugs) await payload.delete({ collection: col, where: { slug: { equals: slug } } })
    }

    const svcA = await publish(
      'services',
      { slug: S.svcA },
      { title: '服务A', summary: '摘', detail: rt('内容') },
      { title: 'Service A', summary: 'sum', detail: rt('body') },
    )
    const svcB = await publish(
      'services',
      { slug: S.svcB },
      { title: '服务B', summary: '摘', detail: rt('内容') },
      { title: 'Service B', summary: 'sum', detail: rt('body') },
    )
    const svcC = await publish(
      'services',
      { slug: S.svcC },
      { title: '服务C', summary: '摘', detail: rt('内容') },
      { title: 'Service C', summary: 'sum', detail: rt('body') },
    )
    // 仅草稿服务(未发布)
    await payload.create({
      collection: 'services',
      locale: 'zh',
      draft: true,
      data: { slug: S.svcDraft, title: '草稿服务', summary: '摘', detail: rt('内容'), _status: 'draft' },
    })
    svcAId = svcA.id
    svcBId = svcB.id

    const mkCase = (slug: string, services: number[]) =>
      publish(
        'cases',
        { slug, client: '客户', services },
        { title: `案例-${slug}`, client: '客户', intro: rt('简介') },
        { title: `Case-${slug}`, client: 'Client', intro: rt('intro') },
      )
    // 创建顺序即 _order 追加序:caseY 先于 caseZ(用于验证 sort:'_order')
    await mkCase(S.caseX, [svcAId, svcBId])
    await mkCase(S.caseY, [svcAId])
    await mkCase(S.caseZ, [svcBId])
    await mkCase(S.caseW, [svcC.id]) // 只关联 svcC → 与 caseX 无共享服务
    // 仅草稿案例(未发布,引用 svcA)
    await payload.create({
      collection: 'cases',
      locale: 'zh',
      draft: true,
      data: { slug: S.caseDraft, title: '草稿案例', client: '客户', intro: rt('简介'), services: [svcAId], _status: 'draft' },
    })

    const now = new Date().toISOString()
    const mkNews = (slug: string) =>
      publish(
        'news',
        { slug, publishedAt: now },
        { title: `新闻-${slug}`, excerpt: '摘', body: rt('正文') },
        { title: `News-${slug}`, excerpt: 'ex', body: rt('body') },
      )
    await mkNews(S.newsA)
    await mkNews(S.newsB)
    await payload.create({
      collection: 'news',
      locale: 'zh',
      draft: true,
      data: { slug: S.newsDraft, title: '草稿新闻', excerpt: '摘', body: rt('正文'), _status: 'draft' },
    })
  })

  it('getCaseBySlug:草稿返回 null,已发布返回记录', async () => {
    expect(await getCaseBySlug(S.caseDraft, 'zh')).toBeNull()
    expect((await getCaseBySlug(S.caseX, 'zh'))?.slug).toBe(S.caseX)
  })

  it('getRelatedCases:仅共享服务、排除自身/草稿/无关案例,按 _order', async () => {
    const x = await getCaseBySlug(S.caseX, 'zh')
    const related = await getRelatedCases(x!, 'zh', 10)
    const slugs = related.map((c) => c.slug)
    expect(slugs).toContain(S.caseY) // 共享 svcA
    expect(slugs).toContain(S.caseZ) // 共享 svcB
    expect(slugs).not.toContain(S.caseX) // 排除自身
    expect(slugs).not.toContain(S.caseDraft) // 草稿不可见
    expect(slugs).not.toContain(S.caseW) // 无共享服务(仅 svcC)→ 证明 where 真过滤
    expect(slugs.indexOf(S.caseY)).toBeLessThan(slugs.indexOf(S.caseZ)) // sort:'_order'(caseY 先建)
  })

  it('getCasesForService:仅返回含该服务的已发布案例', async () => {
    const slugs = (await getCasesForService(svcAId, 'zh', 10)).map((c) => c.slug)
    expect(slugs).toContain(S.caseX)
    expect(slugs).toContain(S.caseY)
    expect(slugs).not.toContain(S.caseZ) // 只含 svcB
    expect(slugs).not.toContain(S.caseDraft) // 草稿不可见
  })

  it('getRelatedNews:排除当前与草稿', async () => {
    const newsA = (
      await payload.find({ collection: 'news', where: { slug: { equals: S.newsA } }, locale: 'zh' })
    ).docs[0]
    const related = await getRelatedNews(newsA as never, 'zh', 10)
    const slugs = related.map((n) => n.slug)
    expect(slugs).not.toContain(S.newsA)
    expect(slugs).not.toContain(S.newsDraft)
    expect(slugs).toContain(S.newsB)
  })

  it('getServices:列表含已发布、排除草稿', async () => {
    const slugs = (await getServices('zh', { limit: 100 })).docs.map((s) => s.slug)
    expect(slugs).toContain(S.svcA)
    expect(slugs).toContain(S.svcB)
    expect(slugs).not.toContain(S.svcDraft) // 草稿服务不出现在公开列表
  })
})
