import 'dotenv/config'
import { getPayload } from 'payload'

import config from './payload.config'

// 中英样例内容(阶段 2)。用 `pnpm seed` 运行(需 dev 库已同步)。
// 走「建 zh 草稿 → 补 en → 发布」流程,满足发布前中英必填门禁(requireBilingual)。

const rt = (text: string) => ({
  root: {
    type: 'root',
    format: '' as const,
    indent: 0,
    version: 1,
    direction: 'ltr' as const,
    children: [
      {
        type: 'paragraph',
        format: '' as const,
        indent: 0,
        version: 1,
        direction: 'ltr' as const,
        children: [
          { type: 'text', format: 0, style: '', mode: 'normal', detail: 0, version: 1, text },
        ],
      },
    ],
  },
})

async function seed() {
  // 破坏性保护:seed 会删除样例 slug 并覆盖 globals。禁 production,且须显式开关确认目标库。
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ 拒绝在 production 运行 seed(会删除并覆盖数据)')
    process.exit(1)
  }
  if (process.env.ALLOW_DESTRUCTIVE_SEED !== 'true') {
    console.error('⚠️ seed 会删除样例并覆盖 globals。确认目标库后运行:ALLOW_DESTRUCTIVE_SEED=true pnpm seed')
    process.exit(1)
  }
  const target = (process.env.DATABASE_URL ?? '').replace(/(:\/\/[^:/@]+:)[^@]*@/, '$1***@')
  console.log(`▶ seed 目标库:${target}`)

  const payload = await getPayload({ config })

  type Slug = 'services' | 'cases' | 'news'
  // 幂等:先按 slug 清掉旧样例
  const bySlug = (slug: string) => ({ slug: { equals: slug } })
  const wipe = async (collection: Slug, slugs: string[]) => {
    for (const s of slugs) await payload.delete({ collection, where: bySlug(s) })
  }
  await wipe('cases', ['grain-brand-launch', 'city-nightscape'])
  await wipe('services', ['brand-strategy', 'film-production'])
  await wipe('news', ['award-won', 'new-studio'])

  // 建 zh 草稿 → 补 en → 发布
  const createBilingual = async (
    collection: Slug,
    common: Record<string, unknown>,
    zh: Record<string, unknown>,
    en: Record<string, unknown>,
  ) => {
    const draft = await payload.create({
      collection,
      locale: 'zh',
      draft: true,
      data: { ...common, ...zh, _status: 'draft' },
    })
    await payload.update({ collection, id: draft.id, locale: 'en', draft: true, data: en })
    return payload.update({ collection, id: draft.id, locale: 'zh', data: { _status: 'published' } })
  }

  const brand = await createBilingual(
    'services',
    { slug: 'brand-strategy' },
    { title: '品牌策略', summary: '从定位到视觉的完整品牌打造。', detail: rt('我们帮助品牌找到独特声音并转化为可执行的视觉系统。') },
    { title: 'Brand Strategy', summary: 'End-to-end brand building, from positioning to visuals.', detail: rt('We help brands find a distinctive voice and turn it into an executable visual system.') },
  )
  const film = await createBilingual(
    'services',
    { slug: 'film-production' },
    { title: '影视制作', summary: '电影级广告片与品牌短片。', detail: rt('从脚本到成片的一站式影视制作。') },
    { title: 'Film Production', summary: 'Cinematic commercials and brand films.', detail: rt('One-stop film production from script to final cut.') },
  )

  const caseA = await createBilingual(
    'cases',
    { slug: 'grain-brand-launch', client: '某品牌', services: [brand.id, film.id] },
    { title: '显影 × 某品牌 发布战役', client: '某品牌', intro: rt('一场围绕新品发布的整合创意战役。') },
    { title: 'GRAIN × Brand Launch Campaign', client: 'A Brand', intro: rt('An integrated creative campaign around a product launch.') },
  )
  const caseB = await createBilingual(
    'cases',
    { slug: 'city-nightscape', client: '城市文旅', services: [film.id] },
    { title: '城市夜行 短片', client: '城市文旅', intro: rt('用镜头记录城市的夜色与呼吸。') },
    { title: 'City Nightscape Film', client: 'City Tourism', intro: rt('Capturing a city’s night and breath on camera.') },
  )

  const now = new Date().toISOString()
  await createBilingual(
    'news',
    { slug: 'award-won', publishedAt: now },
    { title: '我们获得了年度创意奖', excerpt: '团队作品斩获年度大奖。', body: rt('感谢客户与团队,我们获得了年度创意奖。') },
    { title: 'We Won the Creative Award of the Year', excerpt: 'Our work took the annual grand prize.', body: rt('Thanks to our clients and team, we won the Creative Award of the Year.') },
  )
  await createBilingual(
    'news',
    { slug: 'new-studio', publishedAt: now },
    { title: '新工作室开幕', excerpt: '我们搬进了更大的空间。', body: rt('新工作室正式开幕,欢迎来访。') },
    { title: 'New Studio Opening', excerpt: 'We moved into a bigger space.', body: rt('Our new studio is officially open — come visit.') },
  )

  // Globals
  await payload.updateGlobal({ slug: 'site-settings', locale: 'zh', data: { siteName: '显影 GRAIN', brandColor: '#5CC8FF' } })
  await payload.updateGlobal({ slug: 'site-settings', locale: 'en', data: { siteName: 'GRAIN' } })

  const publishGlobal = async (slug: 'home' | 'about' | 'contact', zh: Record<string, unknown>, en: Record<string, unknown>) => {
    await payload.updateGlobal({ slug, locale: 'zh', draft: true, data: { ...zh, _status: 'draft' } })
    await payload.updateGlobal({ slug, locale: 'en', draft: true, data: en })
    await payload.updateGlobal({ slug, locale: 'zh', data: { _status: 'published' } })
  }

  await publishGlobal(
    'home',
    { hero: { title: '制造注意力', subtitle: '电影级创意,作品即主角。' }, featuredServices: [brand.id, film.id], featuredCases: [caseA.id, caseB.id] },
    { hero: { title: 'Make Them Look', subtitle: 'Cinematic creative — the work is the hero.' } },
  )
  await publishGlobal(
    'about',
    { intro: rt('显影是一家以作品为中心的创意公司。') },
    { intro: rt('GRAIN is a work-first creative studio.') },
  )
  await publishGlobal(
    'contact',
    { email: 'hello@grain.example', phone: '+86 000 0000 0000', address: '上海' },
    { address: 'Shanghai' },
  )

  payload.logger.info('✅ 样例内容已灌入(services/cases/news + globals,中英已发布)')
  process.exit(0)
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
