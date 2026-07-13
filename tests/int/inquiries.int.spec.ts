// @vitest-environment node
// 服务端集成测试跑在 node 环境(与 security.int.spec 同因:jsdom 下部分服务端库行为异常)。
// 覆盖阶段 5(dev-plan §10 高危项):原子入队、通知幂等/失败、consent 门禁、honeypot/时间戳、跨进程限流、可信 IP。
import { headers } from 'next/headers'
import { getPayload, type Payload } from 'payload'
import { describe, it, beforeAll, beforeEach, expect, vi } from 'vitest'

import { submitInquiry } from '@/app/(frontend)/[locale]/contact/actions'
import { clientIpFromHeaders } from '@/lib/clientIp'
import { enqueueInquiryNotifications } from '@/lib/enqueueNotifications'
import { sendEmail } from '@/lib/notify'
import { checkRateLimit } from '@/lib/rateLimit'
import config from '@/payload.config'
import type { Inquiry } from '@/payload-types'

// 让 submitInquiry 能在 node 测试环境跑通(headers() 本需 Next 请求上下文)。
// 默认返回空 Headers(无 TRUSTED_IP_HEADER → ip=null → dev 桶);个别用例改其行为断言调用与否。
vi.mock('next/headers', () => ({ headers: vi.fn(async () => new Headers()) }))

// 包装真实 enqueue 为 spy:默认走真实实现(createInquiry/常规用例不受影响);
// 个别守卫用例用 mockRejectedValueOnce 让「enqueue 自身抛出」以验证 action 内层兜底。
vi.mock('@/lib/enqueueNotifications', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/enqueueNotifications')>()
  return { enqueueInquiryNotifications: vi.fn(actual.enqueueInquiryNotifications) }
})

let payload: Payload
let ipSeq = 0 // 每次合法 action 提交用唯一可信 IP → 独立限流桶,避免跨用例/重跑累计

const inquiriesCount = async () =>
  (await payload.count({ collection: 'inquiries', overrideAccess: true })).totalDocs

// 经真实 submitInquiry 提交一份合法表单,并用唯一可信 IP 隔离限流桶。
const validForm = () =>
  fd({ ts: String(Date.now() - 3000), name: '线索', email: 'lead@p5.test', consent: 'true' })
const submitValid = async () => {
  process.env.TRUSTED_IP_HEADER = 'x-real-ip'
  vi.mocked(headers).mockResolvedValue(new Headers({ 'x-real-ip': `p5-act-${++ipSeq}` }))
  try {
    return await submitInquiry({ ok: false }, validForm())
  } finally {
    delete process.env.TRUSTED_IP_HEADER
  }
}

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

// 镜像 Server Action:create(提交)后再入队通知(不再走 afterChange)
const createInquiry = async () => {
  const inq = await payload.create({
    collection: 'inquiries',
    overrideAccess: true,
    data: { name: '测试', email: 'lead@p5.test', consent: true },
  })
  await enqueueInquiryNotifications(payload, inq.id)
  return inq
}

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
    process.env.INQUIRY_RATE_MAX = '5' // 固定阈值,使限流用例确定(默认 20 仅生产放宽)
    payload = await getPayload({ config })
  })

  // 每例复位 headers mock:默认返回空 Headers,并清调用记录(供「未触达限流」断言)
  beforeEach(() => {
    vi.mocked(headers).mockReset()
    vi.mocked(headers).mockImplementation(async () => new Headers())
  })

  it('提交后入队:create + enqueue → 2 条 pending Notifications + 2 个 job;run 后全部 sent', async () => {
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

  // 经真实 submitInquiry 路径验证「线索优先」:create 成功后,入队任一环节失败都不丢单、仍返回 ok。
  it('submitInquiry:jobs.queue 失败(helper 内吞)→ 仍 ok、线索落库、无 job', async () => {
    const before = await inquiriesCount()
    const jobsBefore = await jobCount()
    const spy = vi.spyOn(payload.jobs, 'queue').mockRejectedValue(new Error('注入的入队失败'))
    try {
      expect(await submitValid()).toEqual({ ok: true }) // 通知入队失败绝不翻成 server 错误
      expect(spy).toHaveBeenCalled() // 确证注入生效(入队被调用并抛错)
    } finally {
      spy.mockRestore()
    }
    expect(await inquiriesCount()).toBe(before + 1) // 线索仍落库
    expect(await jobCount()).toBe(jobsBefore) // 入队失败 → 无 job 落库(印证失败已注入)
  })

  it('submitInquiry:notifications 写入失败(helper 内吞)→ 仍 ok、线索落库', async () => {
    const before = await inquiriesCount()
    const orig = payload.create.bind(payload)
    // 只让 notifications 写入失败;inquiries create 走原实现(线索必须落库)
    const spy = vi
      .spyOn(payload, 'create')
      .mockImplementation((args: Parameters<typeof payload.create>[0]) =>
        args.collection === 'notifications'
          ? Promise.reject(new Error('注入的 notifications 写入失败'))
          : orig(args),
      )
    try {
      expect(await submitValid()).toEqual({ ok: true })
      // 确证注入生效:helper 确实尝试写过 notifications(随即被拒)
      expect(spy.mock.calls.some((c) => c[0]?.collection === 'notifications')).toBe(true)
    } finally {
      spy.mockRestore()
    }
    expect(await inquiriesCount()).toBe(before + 1) // 线索仍落库
  })

  it('submitInquiry:enqueue 自身意外抛出 → action 内层兜底仍 ok、线索落库', async () => {
    // 直接令导入的 enqueue reject(绕过 helper 自身吞错)→ 专门守卫 action 的内层 try/catch:
    // 若有人误删该兜底,异常会落到外层 catch 翻成 server 错误,本例即失败。
    const before = await inquiriesCount()
    vi.mocked(enqueueInquiryNotifications).mockRejectedValueOnce(new Error('enqueue 意外抛出'))
    expect(await submitValid()).toEqual({ ok: true })
    expect(await inquiriesCount()).toBe(before + 1) // 线索仍落库
  })

  it('部分失败可观测:notifications 行已建但 job 入队失败 → helper 不抛、每通道告警、行留 pending 且无 job', async () => {
    const inq = await payload.create({
      collection: 'inquiries',
      overrideAccess: true,
      data: { name: '线索', email: 'lead@p5.test', consent: true },
    })
    const jobsBefore = await jobCount()
    const queueSpy = vi.spyOn(payload.jobs, 'queue').mockRejectedValue(new Error('注入的入队失败'))
    const logSpy = vi.spyOn(payload.logger, 'error')
    // 用真实 helper(绕过本文件对该模块的 mock 包装),确保真实入队逻辑与 queue spy 对接
    const { enqueueInquiryNotifications: actualEnqueue } =
      await vi.importActual<typeof import('@/lib/enqueueNotifications')>('@/lib/enqueueNotifications')
    try {
      await expect(actualEnqueue(payload, inq.id)).resolves.toBeUndefined() // 不抛
      // 计数断言须在 mockRestore 前(restore 会清空调用记录)
      expect(queueSpy).toHaveBeenCalledTimes(2) // 两通道都尝试入队
      expect(logSpy.mock.calls.length).toBeGreaterThanOrEqual(2) // 每通道失败各告警(可观测)
    } finally {
      queueSpy.mockRestore()
      logSpy.mockRestore()
    }
    expect(await jobCount()).toBe(jobsBefore) // 无 job 落库
    // 行已建(pending),但无对应 job;本阶段接受「线索在库、通知可能缺失」并已告警,补扫留后续
    const rows = await notifsFor(inq.id)
    expect(rows.length).toBe(2)
    expect(rows.every((n) => n.status === 'pending')).toBe(true)
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

  it('Server Action:honeypot(hp 字段)命中 → 静默成功、不写库', async () => {
    const before = (await payload.count({ collection: 'inquiries', overrideAccess: true })).totalDocs
    const res = await submitInquiry({ ok: false }, fd({ hp: 'bot', name: 'B', email: 'b@p5.test' }))
    expect(res.ok).toBe(true)
    const after = (await payload.count({ collection: 'inquiries', overrideAccess: true })).totalDocs
    expect(after).toBe(before) // 未新增
  })

  it('Server Action:提交过快(时间戳)→ invalid', async () => {
    const res = await submitInquiry({ ok: false }, fd({ ts: String(Date.now()), name: 'B', email: 'b@p5.test' }))
    expect(res).toEqual({ ok: false, error: 'invalid' })
  })

  it('Server Action:无效字段在触达限流前即返回 invalid,且不消耗限流额度', async () => {
    // 限流在 action 里通过 headers() 取 IP;若限流早于校验,headers 必被调用。
    // ts 过关(3s 前)但 email 非法 → 校验先拦下 → headers 应「从未被调用」= 无效提交不占额度。
    vi.mocked(headers).mockClear()
    const res = await submitInquiry(
      { ok: false },
      fd({ ts: String(Date.now() - 3000), name: '', email: 'bad', consent: 'true' }),
    )
    expect(res.error).toBe('invalid')
    expect(headers).not.toHaveBeenCalled() // 未触达限流 → 无效提交不消耗额度
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
