// @vitest-environment node
// sitemap 只输出已发布内容(§12):建一条已发布 + 一条草稿 case,断言草稿不入 sitemap。
import { getPayload, type Payload } from 'payload'
import { describe, it, beforeAll, expect } from 'vitest'

import sitemap from '@/app/sitemap'
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

describe('阶段6 sitemap', () => {
  beforeAll(async () => {
    payload = await getPayload({ config })
    for (const slug of ['sm-pub', 'sm-draft']) {
      await payload.delete({ collection: 'cases', where: { slug: { equals: slug } } })
    }
  })

  it('已发布 case 入 sitemap,草稿 case 不入', async () => {
    // 已发布:走中英必填发布门禁(zh 草稿 → 补 en → 发布)
    const pub = await payload.create({
      collection: 'cases',
      locale: 'zh',
      draft: true,
      data: { slug: 'sm-pub', title: '站点图', client: '客户', intro: rt('简介'), _status: 'draft' },
    })
    await payload.update({
      collection: 'cases',
      id: pub.id,
      locale: 'en',
      draft: true,
      data: { title: 'Sitemap', client: 'Client', intro: rt('Intro') },
    })
    await payload.update({ collection: 'cases', id: pub.id, locale: 'zh', data: { _status: 'published' } })
    // 草稿:不发布
    await payload.create({
      collection: 'cases',
      draft: true,
      data: { slug: 'sm-draft', title: '草稿', client: '客户' },
    })

    const urls = (await sitemap()).map((e) => e.url)
    expect(urls.some((u) => u.endsWith('/zh/work/sm-pub'))).toBe(true)
    expect(urls.some((u) => u.endsWith('/en/work/sm-pub'))).toBe(true)
    expect(urls.some((u) => u.includes('/work/sm-draft'))).toBe(false) // 草稿不外泄
    expect(urls.some((u) => u.endsWith('/zh'))).toBe(true) // 静态首页也在
  })
})
