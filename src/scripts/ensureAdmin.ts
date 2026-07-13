import 'dotenv/config'
import { getPayload } from 'payload'

import config from '../payload.config'

// 首个管理员 bootstrap(§17 / 阶段7 抢注防护):全新库首启时 `/admin` 的 create-first-user
// 对匿名开放,谁先访问谁能抢注成 admin。部署时在**暴露 /admin 之前**跑本脚本建好首管理员,
// 消除空窗。幂等:已存在任一 admin 则 no-op,可安全重跑。
async function ensureAdmin() {
  const payload = await getPayload({ config })

  const { totalDocs } = await payload.count({ collection: 'admins' })
  if (totalDocs > 0) {
    payload.logger.info(`已存在 ${totalDocs} 个管理员账号,跳过 bootstrap`)
    process.exit(0)
  }

  const email = process.env.ADMIN_EMAIL
  const password = process.env.ADMIN_PASSWORD
  if (!email || !password) {
    payload.logger.error('空库但未设 ADMIN_EMAIL / ADMIN_PASSWORD,无法建首个管理员')
    process.exit(1)
  }

  await payload.create({
    collection: 'admins',
    data: { email, password, name: '管理员', roles: ['admin'] },
  })
  payload.logger.info(`✅ 已建首个管理员:${email}(请尽快登录改密)`)
  process.exit(0)
}

ensureAdmin().catch((err) => {
  console.error(err)
  process.exit(1)
})
