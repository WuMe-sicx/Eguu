import crypto from 'crypto'

import { getPayloadClient } from './payload'

// 跨进程 + 并发安全的固定窗口限流(§10)。
// 桶键 = HMAC(ip):windowIndex(不存明文 IP,PIPL);计数用 Postgres 单条原子 upsert 自增,
// 并发请求由数据库串行化 —— 不会像"先 create 再 count"那样在并发下放过超额请求。
// ponytail: 固定窗口 + 每桶一行 counter;需要滑动窗口/更高吞吐再上 Redis。

const WINDOW_MS = 10 * 60 * 1000 // 10 分钟
const DEFAULT_MAX_HITS = 20 // 每窗口每 IP 提交上限。默认放宽到 20 以容忍 NAT/CGN(中国移动/企业出口/
// 校园网多真实客户共享一个公网 IP)——通知只发往站主本人,泛滥可控;可用 INQUIRY_RATE_MAX 覆盖。

// 每次读 env(便于测试注入固定阈值);非正整数则回退默认。
function maxHits(): number {
  const v = Number(process.env.INQUIRY_RATE_MAX)
  return Number.isInteger(v) && v > 0 ? v : DEFAULT_MAX_HITS
}

function bucketKey(ip: string, now: number): string {
  const secret = process.env.PAYLOAD_SECRET || ''
  const hash = crypto.createHmac('sha256', secret).update(ip).digest('hex')
  return `${hash}:${Math.floor(now / WINDOW_MS)}`
}

// db.pool 是 postgres adapter 特有,不在通用 db 类型上;最小类型转换只暴露需要的 query。
type PgPool = { query: (sql: string, params?: unknown[]) => Promise<{ rows: Array<{ count: number | string }> }> }
const pool = (payload: { db: unknown }): PgPool => (payload.db as { pool: PgPool }).pool

/**
 * 记录一次命中并判断是否仍在额度内。返回 true=允许,false=已超限。now 参数便于单测。
 * ip 为 null 表示无可信客户端 IP(未配 TRUSTED_IP_HEADER):
 * - 非生产 → 用固定 dev 桶(可本地测试);
 * - 生产 → 属部署配置缺失,放行 + 告警,**不制造全站共享桶**(避免任意 5 次提交拖垮全站)。阶段 7 必须配置。
 */
export async function checkRateLimit(ip: string | null, now: number = Date.now()): Promise<boolean> {
  if (ip === null) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[rateLimit] 生产缺 TRUSTED_IP_HEADER,已跳过限流(阶段 7 部署必须配置可信 IP 头)')
      return true
    }
    ip = 'local-dev'
  }

  const payload = await getPayloadClient()
  const db = pool(payload)
  const key = bucketKey(ip, now)

  // 单条原子语句:插入或自增当前窗口桶计数,并发下由 DB 串行化
  const { rows } = await db.query(
    `INSERT INTO rate_limit_hits (bucket_key, "count", updated_at, created_at)
     VALUES ($1, 1, now(), now())
     ON CONFLICT (bucket_key) DO UPDATE SET "count" = rate_limit_hits."count" + 1, updated_at = now()
     RETURNING "count"`,
    [key],
  )
  const count = Number(rows[0]?.count ?? 1)
  const limit = maxHits()

  // 机会式清理过期桶,失败不影响判定。用 DB 时钟(now())而非注入的 now:
  // now 参数只决定分桶,updated_at 是 DB 真实写入时间,两者解耦才不会误删刚建的桶。
  void db.query(`DELETE FROM rate_limit_hits WHERE updated_at < now() - interval '20 minutes'`).catch(() => {})

  return count <= limit
}
