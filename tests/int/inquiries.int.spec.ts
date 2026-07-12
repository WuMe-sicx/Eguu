// @vitest-environment node
// 服务端集成测试跑在 node 环境(与 security.int.spec 同因:jsdom 下部分服务端库行为异常)。
// 覆盖阶段 5(dev-plan §10 高危项):原子入队、通知幂等/失败、consent 门禁、honeypot/时间戳、跨进程限流、可信 IP。
import { getPayload, type Payload } from 'payload'
import { describe, it, beforeAll, expect, vi } from 'vitest'

import { submitInquiry } from '@/app/(frontend)/[locale]/contact/actions'
import { clientIpFromHeaders } from '@/lib/clientIp'
import { sendEmail } from '@/lib/notify'
import { checkRateLimit } from '@/lib/rateLimit'
import config from '@/payload.config'
import type { Inquiry } from '@/payload-types'

let payload: Payload

const notifsFor = async (inquiryId: number) =>
  (
    await payload.find({
      collection: 'notifications',
      where: { inquiry: { equals: inquiryId } },
      sort: 'channel',
      overrideAccess: true,
    })
  ).docs

const jobCount = async () =>
  (await payload.count({ collection: 'payload-jobs', overrideAccess: true })).totalDocs

const createInquiry = () =>
  payload.create({
    collection: 'inquiries',
    overrideAccess: true,
    data: { name: '测试', email: 'lead@p5.test', consent: true },
  })

const fd = (entries: Record<string, string>) => {
  const f = new FormData()
  for (const [k, v] of Object.entries(entries)) f.append(k, v)
  return f
}

describe('阶段5 表单与通知', () => {
  beforeAll(async () => {
    // 通道收件人:未配则 afterChange 会跳过通知,测试需显式配上
    process.env.NOTIFY_EMAIL = 'lead@p5.test'
    process.env.NOTIFY_PHONE = '13800000000'
    delete process.env.SMTP_HOST
    delete process.env.SMS_ACCESS_KEY
    delete process.env.TRUSTED_IP_HEADER
    payload = await getPayload({ config })
  })

  it('afterChange 原子入队:create → 2 条 pending Notifications + 2 个 job;run 后全部 sent', async () => {
    const jobsBefore = await jobCount()
    const inq = await createInquiry()

    const pending = await notifsFor(inq.id)
    expect(pending.map((n) => n.channel)).toEqual(['email', 'sms'])
    expect(pending.every((n) => n.status === 'pending')).toBe(true)
    expect((await jobCount()) - jobsBefore).toBe(2)

    await payload.jobs.run({ overrideAccess: true })

    const sent = await notifsFor(inq.id)
    expect(sent.every((n) => n.status === 'sent')).toBe(true)
    expect(sent.find((n) => n.channel === 'email')?.providerId).toBe(`dev-email-${inq.id}`)
    expect(sent.find((n) => n.channel === 'sms')?.providerId).toBe(`dev-sms-${inq.id}`)
  })

  it('notify task 幂等:对已 sent 的通道再次入队并 run,不重发(providerId/状态不变)', async () => {
    const inq = await createInquiry()
    await payload.jobs.run({ overrideAccess: true })
    const before = (await notifsFor(inq.id)).find((n) => n.channel === 'email')!
    expect(before.status).toBe('sent')

    // 再入一个同 (inquiry,email) 的 job → handler 见 sent 应直接跳过
    await payload.jobs.queue({ task: 'notify', input: { inquiryId: inq.id, channel: 'email' } })
    await payload.jobs.run({ overrideAccess: true })

    const after = (await notifsFor(inq.id)).find((n) => n.channel === 'email')!
    expect(after.status).toBe('sent')
    expect(after.providerId).toBe(before.providerId)
    expect(after.attempts).toBe(before.attempts) // 未再递增 = 未重发
  })

  it('并发同 key job 只真实发送一次(concurrency 键 + 幂等)', async () => {
    const inq = await createInquiry() // afterChange 已入 email/sms 各一
    // 再为 email 手动入一个同 key job → 两个同 (inquiry,email) job
    await payload.jobs.queue({ task: 'notify', input: { inquiryId: inq.id, channel: 'email' } })
    await payload.jobs.run({ overrideAccess: true })
    const email = (await notifsFor(inq.id)).find((n) => n.channel === 'email')!
    expect(email.status).toBe('sent')
    expect(email.attempts).toBe(1) // 只发一次:第二个同 key job 被并发键排除 / 幂等跳过
  })

  it('入队失败 → inquiry 整体回滚(afterChange 与 create 同事务原子)', async () => {
    const before = (await payload.count({ collection: 'inquiries', overrideAccess: true })).totalDocs
    const spy = vi.spyOn(payload.jobs, 'queue').mockImplementation(() => {
      throw new Error('注入的入队失败')
    })
    try {
      await expect(createInquiry()).rejects.toThrow()
    } finally {
      spy.mockRestore()
    }
    const after = (await payload.count({ collection: 'inquiries', overrideAccess: true })).totalDocs
    expect(after).toBe(before) // inquiry 未落库(事务回滚)
  })

  it('生产环境缺凭据:sendEmail 抛错且绝不打印 PII / 伪标 sent', async () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {})
    vi.stubEnv('NODE_ENV', 'production')
    delete process.env.SMTP_HOST
    try {
      const fake = { id: 1, name: '张三', email: 'z@p5.test', consent: true, updatedAt: '', createdAt: '' } as Inquiry
      await expect(sendEmail(fake)).rejects.toThrow()
      expect(spy).not.toHaveBeenCalled() // 未打印 PII
    } finally {
      vi.unstubAllEnvs()
      spy.mockRestore()
    }
  })

  it('notify task 失败:发送抛错 → 标 failed + error', async () => {
    process.env.SMTP_HOST = 'smtp.p5.test' // 触发 sendEmail 抛错(逻辑未接入)
    try {
      const inq = await createInquiry()
      await payload.jobs.run({ overrideAccess: true })
      const email = (await notifsFor(inq.id)).find((n) => n.channel === 'email')!
      expect(email.status).toBe('failed')
      expect(email.error).toMatch(/SMTP/)
      expect(email.attempts).toBeGreaterThanOrEqual(1)
    } finally {
      delete process.env.SMTP_HOST
    }
  })

  it('consent=false 被集合级 validate 拒(即便内部 overrideAccess 写入)', async () => {
    await expect(
      payload.create({
        collection: 'inquiries',
        overrideAccess: true,
        data: { name: 'x', email: 'x@p5.test', consent: false },
      }),
    ).rejects.toThrow()
  })

  it('Server Action:honeypot 命中 → 静默成功、不写库', async () => {
    const before = (await payload.count({ collection: 'inquiries', overrideAccess: true })).totalDocs
    const res = await submitInquiry({ ok: false }, fd({ website: 'bot', name: 'B', email: 'b@p5.test' }))
    expect(res.ok).toBe(true)
    const after = (await payload.count({ collection: 'inquiries', overrideAccess: true })).totalDocs
    expect(after).toBe(before) // 未新增
  })

  it('Server Action:提交过快(时间戳)→ invalid', async () => {
    const res = await submitInquiry({ ok: false }, fd({ ts: String(Date.now()), name: 'B', email: 'b@p5.test' }))
    expect(res).toEqual({ ok: false, error: 'invalid' })
  })

  it('限流:同 IP 达阈后被拒,进入新窗口后恢复', async () => {
    const now = 1_000_000_000_000 // 固定基准 → 确定的窗口桶
    const ip = `p5-seq-${Math.floor(process.hrtime()[1])}` // 每次运行唯一 IP,避免跨用例污染
    for (let i = 0; i < 5; i++) expect(await checkRateLimit(ip, now)).toBe(true) // 前 5 次允许
    expect(await checkRateLimit(ip, now)).toBe(false) // 第 6 次超限(同桶 count=6)
    // 下一个窗口 → 不同桶键 → 计数重置为 1 → 恢复允许
    expect(await checkRateLimit(ip, now + 11 * 60 * 1000)).toBe(true)
  })

  it('限流并发安全:10 个并发请求恰好放行 5 个(原子自增,不放过超额)', async () => {
    const now = 2_000_000_000_000
    const ip = `p5-conc-${Math.floor(process.hrtime()[1])}`
    const results = await Promise.all(Array.from({ length: 10 }, () => checkRateLimit(ip, now)))
    expect(results.filter(Boolean).length).toBe(5) // 恰好 5 个 true,并发下不多放
  })

  it('可信 IP:无 TRUSTED_IP_HEADER 或多值头 → null(不信裸 XFF);配单值头才读', () => {
    const headers = new Headers({ 'x-forwarded-for': '1.2.3.4', 'x-real-ip': '9.9.9.9' })
    expect(clientIpFromHeaders(headers)).toBeNull() // 未配 → null(调用方按环境回退,不共享单桶)
    process.env.TRUSTED_IP_HEADER = 'x-real-ip'
    try {
      expect(clientIpFromHeaders(headers)).toBe('9.9.9.9')
      // 多值(逗号)头不可信 → null
      expect(clientIpFromHeaders(new Headers({ 'x-real-ip': '9.9.9.9, 1.2.3.4' }))).toBeNull()
    } finally {
      delete process.env.TRUSTED_IP_HEADER
    }
  })

  it('payload-jobs 权限收紧:editor 不能创建/删除 job(仅 admin 可读)', async () => {
    const ed = await payload.create({
      collection: 'admins',
      data: { name: 'JobEd', email: `jobed-${Date.now()}@p5.test`, password: 'pw123456', roles: ['editor'] },
    })
    const edUser = { ...ed, collection: 'admins' as const }
    // create 恒 false → 匿名/登录都拒(access 先于 data 校验,故 data 形状用宽松签名)
    const create = payload.create as (a: unknown) => Promise<unknown>
    await expect(
      create({
        collection: 'payload-jobs',
        data: { input: { inquiryId: 1, channel: 'email' } },
        overrideAccess: false,
        user: edUser,
      }),
    ).rejects.toThrow()
    // 内部入队一个 job,再验证 editor 删不掉
    const inq = await createInquiry()
    const job = (await payload.find({ collection: 'payload-jobs', limit: 1, overrideAccess: true })).docs[0]
    expect(job).toBeTruthy()
    await expect(
      payload.delete({ collection: 'payload-jobs', id: job!.id, overrideAccess: false, user: edUser }),
    ).rejects.toThrow()
    void inq
  })
})
