'use server'

import { headers } from 'next/headers'

import { enqueueInquiryNotifications } from '@/lib/enqueueNotifications'
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
  // honeypot:隐藏字段被填 → 静默"成功",不写库不通知。字段名 hp(避开 website/url 等自动填充高频目标)。
  // 记匿名日志(不含任何字段值/PII),便于监测真人被自动填充误判的比率。
  if (String(formData.get('hp') ?? '') !== '') {
    console.warn('[inquiry] honeypot 命中(疑似机器人或自动填充误填)')
    return { ok: true }
  }

  // 时间戳:过快提交疑似机器人。ponytail: 时间戳客户端可伪造,仅作弱信号,量大再上验证码。
  const ts = Number(formData.get('ts'))
  if (!Number.isFinite(ts) || Date.now() - ts < MIN_FILL_MS) return { ok: false, error: 'invalid' }

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

  // 限流放在**校验之后**:只有「合法且将落库」的提交才计数,honeypot/时间戳/无效字段不消耗额度
  // (避免无效尝试占满共享 IP 额度、误挡真人)。被限流时记匿名日志(不含 IP/PII)以便发现误挡。
  const ip = clientIpFromHeaders(await headers())
  if (!(await checkRateLimit(ip))) {
    console.warn('[inquiry] 命中限流(共享 IP 可能误挡真人,可调 INQUIRY_RATE_MAX / TRUSTED_IP_HEADER)')
    return { ok: false, error: 'rateLimited' }
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

    const inquiry = await payload.create({
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

    // 线索已落库 → 提交后入队通知(独立事务)。用独立 try/catch 兜底:入队问题绝不翻成对客户的错误
    // (enqueueInquiryNotifications 本身已吞错,这里再保一层,确保 create 成功后一律返回 ok)。
    try {
      await enqueueInquiryNotifications(payload, inquiry.id)
    } catch (e) {
      console.error('[inquiry] enqueue notifications failed (lead saved)', e)
    }
    return { ok: true }
  } catch (e) {
    // 不吞异常:落日志,对外只返回通用错误(不外泄内部细节)
    console.error('[inquiry] create failed', e)
    return { ok: false, error: 'server' }
  }
}
