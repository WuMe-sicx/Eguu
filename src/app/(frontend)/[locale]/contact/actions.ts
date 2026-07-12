'use server'

import { headers } from 'next/headers'

import { defaultLocale, isLocale } from '@/i18n/config'
import { clientIpFromHeaders } from '@/lib/clientIp'
import { getPayloadClient } from '@/lib/payload'
import { checkRateLimit } from '@/lib/rateLimit'
import { isValidEmail } from '@/lib/validators'

// 联系表单 Server Action(§10):honeypot + 时间戳 + 可信 IP 跨进程限流 + 手写校验,
// 通过后用 Local API(overrideAccess:true)内部受控写入 inquiries。
// 匿名 REST/GraphQL 仍被 access.create=isAdmin 拒;写入只此一条受控路径。

export type FieldError = 'name' | 'email' | 'consent'
export type SubmitState = {
  ok: boolean
  error?: 'rateLimited' | 'invalid' | 'server'
  errors?: Partial<Record<FieldError, true>>
}

const MIN_FILL_MS = 2000 // 渲染到提交至少 2s,过快判机器人(弱信号,配合 honeypot + 限流)
// 字段长度上限(防超大 payload 占用存储 / 滥用);与 Inquiries 集合 maxLength 呼应
const LIMITS = { name: 200, email: 254, phone: 40, company: 200, message: 5000 } as const

export async function submitInquiry(_prev: SubmitState, formData: FormData): Promise<SubmitState> {
  // honeypot:隐藏字段被填 → 静默"成功",不写库不通知
  if (String(formData.get('website') ?? '') !== '') return { ok: true }

  // 时间戳:过快提交疑似机器人。ponytail: 时间戳客户端可伪造,仅作弱信号,量大再上验证码。
  const ts = Number(formData.get('ts'))
  if (!Number.isFinite(ts) || Date.now() - ts < MIN_FILL_MS) return { ok: false, error: 'invalid' }

  // 限流(跨进程)先于校验:任何提交尝试都计数以抑制刷量触发短信
  const ip = clientIpFromHeaders(await headers())
  if (!(await checkRateLimit(ip))) return { ok: false, error: 'rateLimited' }

  const name = String(formData.get('name') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim()
  const phone = String(formData.get('phone') ?? '').trim()
  const company = String(formData.get('company') ?? '').trim()
  const message = String(formData.get('message') ?? '').trim()
  const consent = formData.get('consent') === 'true' || formData.get('consent') === 'on'

  const errors: NonNullable<SubmitState['errors']> = {}
  if (!name || name.length > LIMITS.name) errors.name = true
  if (!isValidEmail(email) || email.length > LIMITS.email) errors.email = true
  if (!consent) errors.consent = true
  if (Object.keys(errors).length > 0) return { ok: false, error: 'invalid', errors }
  // 其余可选字段仅超长视为非法(不细分字段)
  if (phone.length > LIMITS.phone || company.length > LIMITS.company || message.length > LIMITS.message) {
    return { ok: false, error: 'invalid' }
  }

  const rawLocale = String(formData.get('locale') ?? '')
  const localeFrom = isLocale(rawLocale) ? rawLocale : defaultLocale

  try {
    const payload = await getPayloadClient()

    // serviceInterest:仅接受"已发布服务"的合法 id,否则丢弃(不因伪造 id 触发 server error)
    let serviceInterest: number | undefined
    const rawService = String(formData.get('serviceInterest') ?? '').trim()
    const svcId = Number(rawService)
    if (/^\d+$/.test(rawService) && Number.isSafeInteger(svcId) && svcId > 0) {
      const { totalDocs } = await payload.count({
        collection: 'services',
        where: { and: [{ id: { equals: svcId } }, { _status: { equals: 'published' } }] },
        overrideAccess: false,
      })
      if (totalDocs > 0) serviceInterest = svcId
    }

    await payload.create({
      collection: 'inquiries',
      overrideAccess: true, // 内部受控写入;匿名 REST/GraphQL 仍被 access.create=isAdmin 拒
      data: {
        name,
        email,
        consent,
        phone: phone || undefined,
        company: company || undefined,
        message: message || undefined,
        serviceInterest,
        localeFrom,
      },
    })
    return { ok: true }
  } catch (e) {
    // 不吞异常:落日志,对外只返回通用错误(不外泄内部细节)
    console.error('[inquiry] create failed', e)
    return { ok: false, error: 'server' }
  }
}
