import type { Payload } from 'payload'

type Channel = 'email' | 'sms'

// §10 提交后入队(线索优先):在 inquiry **已提交之后**调用,故各通道写入均**不传 inquiry 的 req**
// —— 各自独立事务,与 inquiry 事务解耦。因此通知入队失败绝不回滚已落库的 inquiry(修复「流水缺失」)。
// 注:notifications.inquiry 是外键,未提交的 inquiry 对独立事务不可见,故只能提交后入队。
// 逐通道 try/catch:一条失败只告警、不抛、不影响另一条。
// 注:unique(inquiry,channel) 只防「重复调用建重复行」(如双击/重试建第二行);
// 它**不能**修复「行已建但 job 入队失败」的部分失败 —— 那条通道会永久缺 job(本阶段接受:线索在库 +
// 已告警,最终一致靠后续对账补扫扫描无有效 job 的 pending 行再排队)。
export async function enqueueInquiryNotifications(payload: Payload, inquiryId: number): Promise<void> {
  const channels: Channel[] = []
  if (process.env.NOTIFY_EMAIL) channels.push('email')
  if (process.env.NOTIFY_PHONE) channels.push('sms')
  if (channels.length === 0) {
    payload.logger.warn('未配置 NOTIFY_EMAIL / NOTIFY_PHONE,跳过咨询通知')
    return
  }

  for (const channel of channels) {
    try {
      await payload.create({
        collection: 'notifications',
        data: { inquiry: inquiryId, channel, status: 'pending' },
        overrideAccess: true,
      })
      await payload.jobs.queue({ task: 'notify', input: { inquiryId, channel } })
    } catch (e) {
      // 线索已落库;通知入队失败只告警,不影响 inquiry、不影响其它通道(可后续对账补扫)。
      payload.logger.error(
        `咨询通知入队失败 inquiry=${inquiryId} channel=${channel}: ${e instanceof Error ? e.message : String(e)}`,
      )
    }
  }
}
