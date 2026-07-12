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

describe('阶段1 安全边界', () => {
  beforeAll(async () => {
    payload = await getPayload({ config })
    // 清理可能的重跑残留
    for (const email of ['ed@sec.test', 'adm@sec.test', 'sess@sec.test']) {
      await payload.delete({ collection: 'admins', where: { email: { equals: email } } })
    }
    await payload.delete({ collection: 'cases', where: { slug: { equals: 'sec-draft-case' } } })
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
})
