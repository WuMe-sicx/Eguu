// @vitest-environment node
// §11 取数封装的安全回归:公开分支绝不外泄草稿(即使调用方传恶意 where),预览分支能穿透草稿。
// 与 security.int.spec.ts 互补:那里测 access 配置,这里测 lib/payload.ts 封装本身。
import { getPayload, type Payload } from 'payload'
import { describe, it, beforeAll, expect } from 'vitest'

import config from '@/payload.config'
import {
  findPublished,
  findPublishedBySlug,
  getPublicGlobal,
  findPreview,
  getPreviewGlobal,
} from '@/lib/payload'

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

const PUB = 'fetch-pub'
const DRAFT_ONLY = 'fetch-draftonly'
const SECRET = 'GLOBAL_SECRET_DRAFT'

describe('§11 取数封装安全', () => {
  beforeAll(async () => {
    payload = await getPayload({ config })
    for (const slug of [PUB, DRAFT_ONLY]) {
      await payload.delete({ collection: 'services', where: { slug: { equals: slug } } })
    }

    // 已发布 service(双语补齐后发布),再叠一层更新草稿 → 验证 draft:false 只回发布快照
    const pub = await payload.create({
      collection: 'services',
      locale: 'zh',
      draft: true,
      data: { slug: PUB, title: '已发布ZH', summary: '摘', detail: rt('内容'), _status: 'draft' },
    })
    await payload.update({
      collection: 'services',
      id: pub.id,
      locale: 'en',
      draft: true,
      data: { title: 'PublishedEN', summary: 'sum', detail: rt('body') },
    })
    await payload.update({ collection: 'services', id: pub.id, locale: 'zh', data: { _status: 'published' } })
    await payload.update({
      collection: 'services',
      id: pub.id,
      locale: 'zh',
      draft: true,
      data: { title: '草稿改名NEW' },
    })

    // 仅草稿 service(从未发布)
    await payload.create({
      collection: 'services',
      locale: 'zh',
      draft: true,
      data: { slug: DRAFT_ONLY, title: '仅草稿', summary: '摘', detail: rt('内容'), _status: 'draft' },
    })

    // Home 全局:写入草稿 secret(不发布)
    await payload.updateGlobal({ slug: 'home', draft: true, data: { hero: { title: SECRET } } })
  })

  it('findPublished 只回已发布,过滤仅草稿文档', async () => {
    const res = await findPublished('services', 'zh', { where: { slug: { in: [PUB, DRAFT_ONLY] } } })
    const slugs = res.docs.map((d) => d.slug)
    expect(slugs).toContain(PUB)
    expect(slugs).not.toContain(DRAFT_ONLY)
  })

  it('findPublished 回发布快照,忽略更新的草稿内容', async () => {
    const doc = (await findPublished('services', 'zh', { where: { slug: { equals: PUB } } })).docs[0]
    expect(doc?.title).toBe('已发布ZH') // 不是「草稿改名NEW」
  })

  it('恶意 where(_status:draft)无法越过 published 过滤', async () => {
    const res = await findPublished('services', 'zh', { where: { _status: { equals: 'draft' } } })
    expect(res.totalDocs).toBe(0) // and(published, draft) → 空集
  })

  it('恶意 where(or 含 _status:draft)无法拽出草稿', async () => {
    const res = await findPublished('services', 'zh', {
      where: { or: [{ _status: { equals: 'draft' } }, { slug: { equals: DRAFT_ONLY } }] },
    })
    expect(res.docs.some((d) => d.slug === DRAFT_ONLY)).toBe(false)
  })

  it('findPublishedBySlug 不回仅草稿记录,回已发布记录', async () => {
    expect(await findPublishedBySlug('services', DRAFT_ONLY, 'zh')).toBeNull()
    expect((await findPublishedBySlug('services', PUB, 'zh'))?.slug).toBe(PUB)
  })

  it('getPublicGlobal 不回全局最新草稿', async () => {
    const g = await getPublicGlobal('home', 'zh')
    expect(g?.hero?.title).not.toBe(SECRET)
  })

  it('预览分支(已授权上下文)能穿透草稿', async () => {
    const res = await findPreview('services', 'zh', { where: { slug: { equals: DRAFT_ONLY } } })
    expect(res.docs.some((d) => d.slug === DRAFT_ONLY)).toBe(true)
    const g = await getPreviewGlobal('home', 'zh')
    expect(g?.hero?.title).toBe(SECRET)
  })
})
