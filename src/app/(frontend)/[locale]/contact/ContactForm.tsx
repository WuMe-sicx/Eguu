'use client'

import { useActionState, useEffect, useRef, useState } from 'react'

import type { Locale } from '@/i18n/config'
import type { Dict } from '@/i18n/zh'

import { submitInquiry, type SubmitState } from './actions'

type ServiceOption = { id: number; title: string }
type FormDict = Dict['pages']['contact']['form']

const initial: SubmitState = { ok: false }

export default function ContactForm({
  locale,
  services,
  t,
}: {
  locale: Locale
  services: ServiceOption[]
  t: FormDict
}) {
  const [state, action, pending] = useActionState(submitInquiry, initial)
  const [ts, setTs] = useState('')
  const formRef = useRef<HTMLFormElement>(null)

  // 客户端挂载时间戳(服务端校验渲染→提交间隔);SSR 时为空,水合后填入
  useEffect(() => setTs(String(Date.now())), [])
  useEffect(() => {
    if (state.ok) formRef.current?.reset()
  }, [state.ok])

  if (state.ok) {
    return (
      <p className="form-success" role="status">
        {t.success}
      </p>
    )
  }

  return (
    <form ref={formRef} action={action} className="contact-form" noValidate>
      <input type="hidden" name="ts" value={ts} />
      <input type="hidden" name="locale" value={locale} />
      {/* honeypot:视觉隐藏,真人不填、机器人易填 */}
      <div aria-hidden className="hp">
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <label className="field">
        <span>{t.name} *</span>
        <input name="name" required aria-invalid={state.errors?.name || undefined} />
      </label>
      <label className="field">
        <span>{t.email} *</span>
        <input name="email" type="email" required aria-invalid={state.errors?.email || undefined} />
      </label>
      <label className="field">
        <span>{t.phone}</span>
        <input name="phone" autoComplete="tel" />
      </label>
      <label className="field">
        <span>{t.company}</span>
        <input name="company" autoComplete="organization" />
      </label>
      {services.length > 0 && (
        <label className="field">
          <span>{t.service}</span>
          <select name="serviceInterest" defaultValue="">
            <option value="">{t.servicePlaceholder}</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="field">
        <span>{t.message}</span>
        <textarea name="message" rows={4} />
      </label>
      <label className="consent">
        <input type="checkbox" name="consent" value="true" aria-invalid={state.errors?.consent || undefined} />
        <span>
          {t.consent}{' '}
          <a href={`/${locale}/privacy`} target="_blank" rel="noopener noreferrer">
            {t.privacy}
          </a>
        </span>
      </label>

      {state.error === 'rateLimited' && (
        <p className="form-error" role="alert">
          {t.rateLimited}
        </p>
      )}
      {state.error === 'invalid' && (
        <p className="form-error" role="alert">
          {t.invalid}
        </p>
      )}
      {state.error === 'server' && (
        <p className="form-error" role="alert">
          {t.serverError}
        </p>
      )}

      <button type="submit" disabled={pending}>
        {pending ? t.sending : t.submit}
      </button>
    </form>
  )
}
