// 阶段7 生产 schema 保护(§17):push 仅 development/test 开启,其余一律关闭(fail-safe)。
import { describe, it, expect } from 'vitest'

import { shouldPush } from '@/lib/dbPush'

describe('阶段7 生产 push 保护', () => {
  it('仅 development/test 开启 push', () => {
    expect(shouldPush('development')).toBe(true)
    expect(shouldPush('test')).toBe(true)
  })

  it('生产/缺失/拼错 一律关闭(不 fail-open)', () => {
    expect(shouldPush('production')).toBe(false)
    expect(shouldPush('prod')).toBe(false) // 拼错
    expect(shouldPush('staging')).toBe(false)
    expect(shouldPush('')).toBe(false) // 空值
    expect(shouldPush(undefined)).toBe(false) // 缺失
  })
})
