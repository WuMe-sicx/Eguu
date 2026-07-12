import type { TaskConfig } from 'payload'

import { sendEmail, sendSms } from '@/lib/notify'
import type { Inquiry, Notification } from '@/payload-types'

type Channel = 'email' | 'sms'

// notify task(§10):按 (inquiryId, channel) 发送,读 Notifications 行做幂等,
// 成功写 sent+providerId,失败写 failed+error 并抛错让 jobs 退避重试(至少一次投递)。
export const notifyTask: TaskConfig<{
  input: { inquiryId: number; channel: Channel }
  output: Record<string, never>
}> = {
  slug: 'notify',
  retries: { attempts: 5, backoff: { type: 'exponential', delay: 30_000 } },
  // 独占并发键(需 jobs.enableConcurrencyControl):同一 (inquiry,channel) 的 job 不并发执行,
  // 与下方 status==='sent' 幂等叠加,消除重复投递竞态。
  concurrency: ({ input }) => `notify:${input.inquiryId}:${input.channel}`,
  inputSchema: [
    { name: 'inquiryId', type: 'number', required: true },
    { name: 'channel', type: 'text', required: true },
  ],
  handler: async ({ input, req }) => {
    const { inquiryId, channel } = input
    const payload = req.payload

    const { docs } = await payload.find({
      collection: 'notifications',
      where: { and: [{ inquiry: { equals: inquiryId } }, { channel: { equals: channel } }] },
      limit: 1,
      depth: 0,
      overrideAccess: true,
      req,
    })
    const row = docs[0] as Notification | undefined
    // afterChange 与 inquiry 同事务建行;缺行属异常 → 抛错重试/告警,不静默吞。
    if (!row) throw new Error(`Notifications 行缺失 inquiry=${inquiryId} channel=${channel}`)
    if (row.status === 'sent') return { output: {} } // 幂等:已发不再发

    const inquiry = (await payload.findByID({
      collection: 'inquiries',
      id: inquiryId,
      depth: 0,
      overrideAccess: true,
      req,
    })) as Inquiry

    const attempts = (row.attempts ?? 0) + 1
    try {
      const { providerId } = channel === 'email' ? await sendEmail(inquiry) : await sendSms(inquiry)
      await payload.update({
        collection: 'notifications',
        id: row.id,
        data: { status: 'sent', providerId, error: null, attempts },
        overrideAccess: true,
        req,
      })
      return { output: {} }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      await payload.update({
        collection: 'notifications',
        id: row.id,
        data: { status: 'failed', error: message, attempts },
        overrideAccess: true,
        req,
      })
      throw e // 交由 jobs 退避重试
    }
  },
}
