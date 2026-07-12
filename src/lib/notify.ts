import type { Inquiry } from '@/payload-types'

// 通知传输(§10)。真实 SMTP / 云短信待外部凭据接入。
// 生产环境:缺凭据或逻辑未接入一律抛错(→ 通知标 failed 并重试),绝不打印 PII、绝不伪标已发。
// 非生产(dev/test)且无凭据:打印控制台,返回伪 providerId,便于本地端到端验证。
// 抛错 = 发送失败,由 jobs 退避重试;调用方(worker)负责记状态。

export type SendResult = { providerId: string }

const isDevLike = () => process.env.NODE_ENV !== 'production' // 运行时读取,便于测试与生产区分
const brief = (i: Inquiry) => `#${i.id} ${i.name} <${i.email}>${i.phone ? ` ${i.phone}` : ''}`

export async function sendEmail(inquiry: Inquiry): Promise<SendResult> {
  const to = process.env.NOTIFY_EMAIL
  if (!to) throw new Error('NOTIFY_EMAIL 未配置')
  if (process.env.SMTP_HOST) {
    // TODO(凭据到位):@payloadcms/email-nodemailer / nodemailer 真实发送,返回供应商 message id
    throw new Error('SMTP_HOST 已配置但邮件发送逻辑待接入')
  }
  if (!isDevLike()) throw new Error('生产环境未配置 SMTP,拒绝伪发送(避免丢通知/泄露 PII)')
  console.info(`[notify:email] → ${to} 新咨询 ${brief(inquiry)}`)
  return { providerId: `dev-email-${inquiry.id}` }
}

export async function sendSms(inquiry: Inquiry): Promise<SendResult> {
  const to = process.env.NOTIFY_PHONE
  if (!to) throw new Error('NOTIFY_PHONE 未配置')
  if (process.env.SMS_ACCESS_KEY) {
    // TODO(凭据到位):阿里云/腾讯云短信,幂等键透传 inquiryId+channel,返回 request id
    throw new Error('SMS_ACCESS_KEY 已配置但短信发送逻辑待接入')
  }
  if (!isDevLike()) throw new Error('生产环境未配置短信,拒绝伪发送(避免丢通知/泄露 PII)')
  console.info(`[notify:sms] → ${to} 新咨询 ${brief(inquiry)}`)
  return { providerId: `dev-sms-${inquiry.id}` }
}
