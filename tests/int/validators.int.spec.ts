import sharp from 'sharp'
import { describe, it, expect } from 'vitest'

import { validateSlug } from '@/fields/slug'
import {
  isAllowedVideoId,
  isAllowedAnalyticsId,
  isValidHexColor,
  imageMimeFromSharp,
  isVideoContainer,
} from '@/lib/validators'

const tiny = (fmt: 'png' | 'jpeg' | 'webp' | 'avif') =>
  sharp({ create: { width: 8, height: 8, channels: 3, background: { r: 1, g: 2, b: 3 } } })[fmt]().toBuffer()

// 纯校验函数单测(不连库)。守住阶段 1 的安全边界:slug 规范、视频嵌入只收白名单 ID、统计只收结构化 ID。
describe('validators', () => {
  it('slug: 接受合法、拒非法/保留字', () => {
    expect(validateSlug('brand-launch-2024')).toBe(true)
    expect(validateSlug('Bad Slug')).not.toBe(true) // 大写+空格
    expect(validateSlug('a_b')).not.toBe(true) // 下划线
    expect(validateSlug('')).not.toBe(true)
    expect(validateSlug('admin')).not.toBe(true) // 保留字
    expect(validateSlug(123)).not.toBe(true) // 非字符串
  })

  it('video id: 仅白名单平台 + 格式', () => {
    expect(isAllowedVideoId('tencent', 'a0537wxxxxx')).toBe(true)
    expect(isAllowedVideoId('bilibili', 'BV1xx411c7mD')).toBe(true)
    expect(isAllowedVideoId('bilibili', 'av12345')).toBe(true)
    expect(isAllowedVideoId('youtube', 'abc')).toBe(false) // 平台不在白名单
    expect(isAllowedVideoId('tencent', '<script>')).toBe(false) // 拒 HTML/注入
    expect(isAllowedVideoId('bilibili', 'xx')).toBe(false) // 格式不符
  })

  it('provider 判断:原型继承键不误判(防 500)', () => {
    // 'toString'/'constructor'/'__proto__' 在对象上继承存在,但不是合法 provider
    for (const k of ['toString', 'constructor', '__proto__', 'hasOwnProperty']) {
      expect(isAllowedVideoId(k, 'x')).toBe(false)
      expect(isAllowedAnalyticsId(k, 'x')).toBe(false)
    }
  })

  it('analytics id: 供应商专属格式', () => {
    expect(isAllowedAnalyticsId('baidu', 'a'.repeat(32))).toBe(true)
    expect(isAllowedAnalyticsId('google', 'G-ABCDE12345')).toBe(true)
    expect(isAllowedAnalyticsId('umami', '123e4567-e89b-12d3-a456-426614174000')).toBe(true)
    expect(isAllowedAnalyticsId('umami', 'a'.repeat(36))).toBe(false) // 非 UUID 分段
    expect(isAllowedAnalyticsId('baidu', 'short')).toBe(false)
    expect(isAllowedAnalyticsId('none', 'x')).toBe(false)
    expect(isAllowedAnalyticsId('google', '<script>')).toBe(false)
  })

  it('hex color: 仅 #rrggbb', () => {
    expect(isValidHexColor('#5CC8FF')).toBe(true)
    expect(isValidHexColor('#fff')).toBe(false) // 缩写不收
    expect(isValidHexColor('red')).toBe(false)
    expect(isValidHexColor('#5CC8FF;color:red')).toBe(false) // 拒 CSS 注入
  })

  it('imageMimeFromSharp: 真实 sharp 元数据 → MIME(含 AVIF=heif/av1 回归)', async () => {
    for (const [fmt, mime] of [
      ['png', 'image/png'],
      ['jpeg', 'image/jpeg'],
      ['webp', 'image/webp'],
      ['avif', 'image/avif'], // 关键:sharp 0.34 报 heif/av1,不能被误拒
    ] as const) {
      const meta = await sharp(await tiny(fmt)).metadata()
      expect(imageMimeFromSharp(meta)).toBe(mime)
    }
    // HEIC(heif + hevc)不允许
    expect(imageMimeFromSharp({ format: 'heif', compression: 'hevc' })).toBeUndefined()
    expect(imageMimeFromSharp({ format: 'gif' })).toBeUndefined()
  })

  it('isVideoContainer: magic-byte 校验容器', () => {
    const mp4 = Buffer.concat([Buffer.from([0, 0, 0, 0]), Buffer.from('ftypisom')])
    const webm = Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x01, 0x02])
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])
    expect(isVideoContainer(mp4, 'video/mp4')).toBe(true)
    expect(isVideoContainer(webm, 'video/webm')).toBe(true)
    expect(isVideoContainer(png, 'video/mp4')).toBe(false) // PNG 伪装成 mp4 被拒
    expect(isVideoContainer(mp4, 'video/webm')).toBe(false) // 容器与声明不符
  })
})
