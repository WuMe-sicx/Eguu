import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { seoPlugin } from '@payloadcms/plugin-seo'
import { zh } from '@payloadcms/translations/languages/zh'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Admins } from './collections/Admins'
import { Media } from './collections/Media'
import { Cases } from './collections/Cases'
import { Services } from './collections/Services'
import { News } from './collections/News'
import { Inquiries } from './collections/Inquiries'
import { Notifications } from './collections/Notifications'
import { RateLimitHits } from './collections/RateLimitHits'
import { SiteSettings } from './globals/SiteSettings'
import { Home } from './globals/Home'
import { About } from './globals/About'
import { Contact } from './globals/Contact'
import { notifyTask } from './jobs/notify'
import { shouldPush } from './lib/dbPush'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Admins.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Admins, Media, Cases, Services, News, Inquiries, Notifications, RateLimitHits],
  globals: [SiteSettings, Home, About, Contact],
  localization: {
    locales: [
      { label: '中文', code: 'zh' },
      { label: 'English', code: 'en' },
    ],
    defaultLocale: 'zh',
    fallback: true,
  },
  // 后台 UI 语言(与内容双语 localization 无关):Payload 默认只含 en。这里设为中文。
  // 需英文时改成 supportedLanguages: { zh, en },管理员可在账户设置切换。
  i18n: {
    supportedLanguages: { zh },
    fallbackLanguage: 'zh',
  },
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || '',
    },
    // §17 迁移:dev/test 用 push(Drizzle 直接同步本地/测试库);生产走 `payload migrate`
    // (独立单实例 release job)。shouldPush 为 fail-safe 白名单,未知/缺失 NODE_ENV 不 push。
    push: shouldPush(process.env.NODE_ENV),
    migrationDir: path.resolve(dirname, 'migrations'),
  }),
  sharp,
  // 通知 worker(§10):dev 用 autoRun 轮询已入队 job(Docker 长驻,非 serverless);
  // 生产改为受保护单独 runner / cron(阶段 7)。run 端点仅 admin 可触发。
  jobs: {
    tasks: [notifyTask],
    deleteJobOnComplete: false, // 保留完成记录便于对账/排查
    enableConcurrencyControl: true, // 启用 task concurrency 键(notify 按 inquiry+channel 独占,防并发双发)
    access: {
      run: ({ req }) => Boolean((req.user as { roles?: string[] } | null)?.roles?.includes('admin')),
    },
    // 收紧自动生成的 payload-jobs 集合权限:默认对任意登录用户开放 CRUD,
    // 会让 editor 删/改/伪造通知 job。改为仅 admin 可读,外部一律不可写(内部 queue/run 走 overrideAccess)。
    jobsCollectionOverrides: ({ defaultJobsCollection }) => ({
      ...defaultJobsCollection,
      access: {
        ...defaultJobsCollection.access,
        create: () => false,
        read: ({ req }) => Boolean((req.user as { roles?: string[] } | null)?.roles?.includes('admin')),
        update: () => false,
        delete: () => false,
      },
    }),
    // 仅 dev 自动轮询(next dev → NODE_ENV=development);test/prod 不自动跑(测试确定性 + 生产用 §17 独立 runner)。
    autoRun:
      process.env.NODE_ENV === 'development'
        ? [{ cron: '*/15 * * * * *', limit: 10, queue: 'default' }]
        : [],
  },
  plugins: [
    seoPlugin({
      collections: ['cases', 'services', 'news'],
      uploadsCollection: 'media',
      tabbedUI: true,
      generateTitle: ({ doc }) => (typeof doc?.title === 'string' ? doc.title : ''),
    }),
  ],
})
