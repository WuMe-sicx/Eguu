// sitemap 分页逻辑(mock findPublished,无需真建 501 条):跨页续读、去重、失败传播。
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { findPublished } = vi.hoisted(() => ({ findPublished: vi.fn() }))
vi.mock('@/lib/payload', () => ({
  findPublished,
  getPublicGlobal: vi.fn(),
  getPayloadClient: vi.fn(),
}))

// mock 之后再导入(vi.mock 会被提升,静态 import 生效)
import sitemap from '@/app/sitemap'

const empty = { docs: [], hasNextPage: false }

beforeEach(() => findPublished.mockReset())

describe('阶段6 sitemap 分页', () => {
  it('跨页续读:cases 两页都请求、两页 URL 各出现一次', async () => {
    findPublished.mockImplementation((collection: string, _locale: string, opts: { page: number }) => {
      if (collection === 'cases') {
        if (opts.page === 1) return Promise.resolve({ docs: [{ slug: 'p1', updatedAt: 'x' }], hasNextPage: true })
        if (opts.page === 2) return Promise.resolve({ docs: [{ slug: 'p2', updatedAt: 'x' }], hasNextPage: false })
      }
      return Promise.resolve(empty)
    })

    const urls = (await sitemap()).map((e) => e.url)
    expect(urls.filter((u) => u.endsWith('/zh/work/p1')).length).toBe(1)
    expect(urls.filter((u) => u.endsWith('/zh/work/p2')).length).toBe(1) // 第二页未被漏
    const casesPages = findPublished.mock.calls
      .filter((c) => c[0] === 'cases')
      .map((c) => (c[2] as { page: number }).page)
    expect(casesPages).toEqual([1, 2]) // 顺序请求 1、2,hasNextPage=false 后终止
  })

  it('后续页查询失败 → sitemap 抛错,不返回部分结果', async () => {
    findPublished.mockImplementation((collection: string, _locale: string, opts: { page: number }) => {
      if (collection === 'cases') {
        if (opts.page === 1) return Promise.resolve({ docs: [{ slug: 'p1' }], hasNextPage: true })
        return Promise.reject(new Error('db down'))
      }
      return Promise.resolve(empty)
    })
    await expect(sitemap()).rejects.toThrow()
  })
})
