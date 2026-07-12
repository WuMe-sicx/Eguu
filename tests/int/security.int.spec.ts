// @vitest-environment node
// 服务端集成测试跑在 node 环境:jsdom 下 jose 的跨 realm Uint8Array 校验会让 login 误报。
import { getPayload, type Payload } from 'payload'
import { describe, it, beforeAll, expect } from 'vitest'

import config from '@/payload.config'

// 阶段 1 安全边界的窄回归测试(对应 dev-plan §18 高危项;完整 CI 套件在阶段 7)。
// 覆盖:匿名草稿不可见(global/collection)、editor 不能自提权、降权清 session、匿名 inquiry 被拒。
// 上传 MIME 嗅探/视频容器校验为纯函数,单测在 validators.int.spec.ts。
let payload: Payload

const asUser = <T extends object>(doc: T) => ({ ...doc, collection: 'admins' as const })

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

describe('阶段1 安全边界', () => {
  beforeAll(async () => {
    payload = await getPayload({ config })
    // 清理可能的重跑残留
    for (const email of ['ed@sec.test', 'adm@sec.test', 'sess@sec.test']) {
      await payload.delete({ collection: 'admins', where: { email: { equals: email } } })
    }
    await payload.delete({ collection: 'cases', where: { slug: { equals: 'sec-draft-case' } } })
    await payload.delete({ collection: 'services', where: { slug: { equals: 'bi-test' } } })
    await payload.delete({ collection: 'services', where: { slug: { equals: 'bi-empty' } } })
  })

  it('匿名 ?draft=true 读不到 global 草稿', async () => {
    await payload.updateGlobal({ slug: 'home', draft: true, data: { hero: { title: 'SECRET_DRAFT' } } })

    const anon = await payload.findGlobal({ slug: 'home', draft: true, overrideAccess: false })
    expect(anon?.hero?.title).not.toBe('SECRET_DRAFT')

    const admin = await payload.create({
      collection: 'admins',
      data: { name: 'Adm', email: 'adm@sec.test', password: 'pw123456', roles: ['admin'] },
    })
    const authed = await payload.findGlobal({
      slug: 'home',
      draft: true,
      overrideAccess: false,
      user: asUser(admin),
    })
    expect(authed?.hero?.title).toBe('SECRET_DRAFT') // 登录内容角色能看草稿
  })

  it('匿名 ?draft=true 读不到 collection 草稿', async () => {
    await payload.create({
      collection: 'cases',
      draft: true,
      data: { title: 'SECRET_CASE', slug: 'sec-draft-case', client: 'X' },
    })
    const anon = await payload.find({
      collection: 'cases',
      draft: true,
      overrideAccess: false,
      where: { slug: { equals: 'sec-draft-case' } },
    })
    expect(anon.totalDocs).toBe(0)
  })

  it('editor 不能把自己提权为 admin(roles 字段级 access)', async () => {
    const ed = await payload.create({
      collection: 'admins',
      data: { name: 'Ed', email: 'ed@sec.test', password: 'pw123456', roles: ['editor'] },
    })
    const updated = await payload.update({
      collection: 'admins',
      id: ed.id,
      data: { roles: ['admin'] },
      overrideAccess: false,
      user: asUser(ed),
    })
    expect(updated.roles).toEqual(['editor']) // roles 变更被剥离
  })

  it('降权即失权:角色变更清空该账号 session', async () => {
    await payload.create({
      collection: 'admins',
      data: { name: 'Sess', email: 'sess@sec.test', password: 'pw123456', roles: ['admin'] },
    })
    await payload.login({ collection: 'admins', data: { email: 'sess@sec.test', password: 'pw123456' } })
    const before = (
      await payload.find({
        collection: 'admins',
        where: { email: { equals: 'sess@sec.test' } },
        showHiddenFields: true,
      })
    ).docs[0]
    expect((before.sessions ?? []).length).toBeGreaterThan(0)

    const after = await payload.update({
      collection: 'admins',
      id: before.id,
      data: { roles: ['editor'] },
      showHiddenFields: true,
    })
    expect((after.sessions ?? []).length).toBe(0)
  })

  it('匿名创建 inquiry 被拒(access.create 仅 admin)', async () => {
    await expect(
      payload.create({
        collection: 'inquiries',
        overrideAccess: false,
        data: { name: 'x', email: 'x@x.co', consent: true },
      }),
    ).rejects.toThrow()
  })

  it('发布前中英必填:仅 zh 拒绝,补 en 后放行', async () => {
    const draft = await payload.create({
      collection: 'services',
      locale: 'zh',
      draft: true,
      data: { slug: 'bi-test', title: '仅中文', summary: '摘要', detail: rt('内容'), _status: 'draft' },
    })
    // en 缺 → 发布被拒
    await expect(
      payload.update({ collection: 'services', id: draft.id, locale: 'zh', data: { _status: 'published' } }),
    ).rejects.toThrow()
    // 补 en 草稿后 → 发布放行
    await payload.update({
      collection: 'services',
      id: draft.id,
      locale: 'en',
      draft: true,
      data: { title: 'EN Only', summary: 'sum', detail: rt('body') },
    })
    const pub = await payload.update({
      collection: 'services',
      id: draft.id,
      locale: 'zh',
      data: { _status: 'published' },
    })
    expect(pub._status).toBe('published')
  })

  it('发布前中英必填:en richText 为空编辑器也拒绝', async () => {
    const emptyRt = {
      root: { type: 'root', format: '', indent: 0, version: 1, direction: null, children: [] },
    } as unknown as ReturnType<typeof rt>
    const draft = await payload.create({
      collection: 'services',
      locale: 'zh',
      draft: true,
      data: { slug: 'bi-empty', title: '中', summary: '摘', detail: rt('内容'), _status: 'draft' },
    })
    // en 的 detail 是空编辑器(有对象但无文本)→ 仍应拒绝发布
    await payload.update({
      collection: 'services',
      id: draft.id,
      locale: 'en',
      draft: true,
      data: { title: 'EN', summary: 'sum', detail: emptyRt },
    })
    await expect(
      payload.update({ collection: 'services', id: draft.id, locale: 'zh', data: { _status: 'published' } }),
    ).rejects.toThrow()
  })
})
