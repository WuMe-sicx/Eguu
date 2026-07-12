import type { CollectionConfig } from 'payload'

import { isAdmin } from '../access'

// 限流固定窗口桶(§10 跨进程持久 + 并发安全):
// bucketKey = HMAC(ip):windowIndex(不存明文 IP,PIPL),count 由原子 upsert 自增(见 lib/rateLimit)。
// 集合仅定义 schema/权限;计数走 payload.db.pool 的 INSERT ... ON CONFLICT 原子语句。
export const RateLimitHits: CollectionConfig = {
  slug: 'rate-limit-hits',
  admin: { useAsTitle: 'bucketKey', hidden: true },
  access: {
    create: () => false, // 仅内部原子 SQL 写入
    read: isAdmin,
    update: () => false,
    delete: isAdmin,
  },
  fields: [
    { name: 'bucketKey', type: 'text', required: true, unique: true, index: true },
    { name: 'count', type: 'number', required: true, defaultValue: 0 },
  ],
}
