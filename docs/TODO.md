# TODO — 国际广告公司官网 MVP

> 依据 [`dev-plan.md`](dev-plan.md)(Codex ✅ PASS)。🔒 = 来自 §18 的安全/合规硬项,不得省。
> 每阶段做完 **✅ 验证点** 再进下一阶段。当前:**阶段 0 核心已过,收尾待外部凭据**。

---

## 阶段 0 · 脚手架与基础设施 🟡
- [x] `create-payload-app` **blank 模板**初始化(Next.js **16.2** + Payload **3.86** + React 19 + TS)
- [x] PostgreSQL:`@payloadcms/db-postgres` + `DATABASE_URL`(`postgres://root@127.0.0.1:5432/egouu`,FlyEnv/PG18,trust);dev `push:true` ✅ / prod `push:false` 🔒(部署时)
- [x] `pnpm install` + `pnpm dev` → **`/admin` 200**,schema 已 push,建首个管理员 `admin@egouu.local` 登录 200
- [ ] 对象存储:`@payloadcms/storage-s3`,**私有 bucket + `signedDownloads`** 🔒 — **待你给 OSS/COS bucket + 密钥**(暂用本地磁盘存储)
- [ ] 邮件:`@payloadcms/email-nodemailer` + SMTP 🔒 — **待你给 SMTP 凭据**(dev 暂打印到控制台)
- [ ] Tailwind CSS(可现在加)
- [ ] `.env.example` 按 §5 补齐
- **✅ 验证**:`/admin` + 首个管理员 ✅ 已过;「上传 → 私有 bucket → 签名 URL」待 OSS 凭据

## 阶段 1 · 数据模型
- [ ] localization `locales:['zh','en'] defaultLocale:'zh' fallback:true`
- [ ] collections(每个一文件):`Admins` / `Media` / `Cases` / `Services` / `News` / `Inquiries`
- [ ] 复用 slug 字段(必填/唯一/索引/`^[a-z0-9-]+$`/保留字)——cases/services/news 🔒
- [ ] `Admins`:auth + `roles`(admin/editor,`saveToJWT`);`roles` 字段级 update 限 admin;降权撤销 session 🔒
- [ ] `Media`:MIME 白名单 + 大小/像素上限 + 扩展名/MIME 校验 🔒
- [ ] `Cases`:`videoType` 互斥 + 视频嵌入白名单(腾讯/B站 ID,不存 embed HTML)🔒
- [ ] `News`:`publishedAt` 发布必填
- [ ] `Inquiries`:`consent` 必填;`access.create` 仅 admin(拒 REST+GraphQL 匿名)🔒
- [ ] globals:`SiteSettings`(统计结构化字段,仅 admin)/ `Home`(`featuredCases` 唯一来源)/ `About` / `Contact`(地图白名单)
- [ ] globals drafts:home/about/contact 开;settings 即时 🔒
- [ ] drafts + orderable + SEO 插件;`payload generate:types`
- **✅ 验证**:后台各类中英双语录入、草稿、发布、拖拽排序、SEO

## 阶段 2 · 后台可用 + 样例
- [ ] 权限矩阵落地(§8)+ 字段校验 + 媒体尺寸变体
- [ ] 录入中英样例内容
- **✅ 验证**:非技术同事能独立「新增案例(中英)+ 图/视频 + 草稿 + 预览 + 发布 + 排序 + SEO」

## 阶段 3 · 前台骨架
- [ ] `[locale]` 路由 + middleware(默认 `zh`)
- [ ] 根 layout:导航 / 页脚 / 主题(深浅,品牌浅蓝 `#5CC8FF`)/ 语言切换
- [ ] 取数封装:`getPayload`;**公开查询 `overrideAccess:false` + `_status:published`**;四查询分支 🔒
- [ ] i18n UI 字典 `zh/en`
- **✅ 验证**:中英 / 深浅切换、导航;无横向滚动

## 阶段 4 · 前台页面
- [ ] 首页(主视觉 / 简介 / 服务 / `featuredCases` / 最新新闻 / CTA)
- [ ] 案例列表+详情、服务列表+详情、关于、新闻列表+详情、联系
- [ ] 隐私政策 `/[locale]/privacy`(页脚入口)🔒
- [ ] 图片/视频优化:`next/image`、CDN、poster、懒加载、首屏 `priority`
- [ ] 草稿预览:`/api/preview`(`PREVIEW_SECRET` + 管理员认证 + 路径白名单)+ `/api/exit-preview` 🔒
- **✅ 验证**:7 类页面桌面/移动达标;作品突出;加载顺畅
- 视觉基准:[`brand-mockup.html`](brand-mockup.html) / §19

## 阶段 5 · 表单与通知
- [ ] 联系表单 Server Action:zod + honeypot + 可信 IP(覆盖 XFF)+ 跨进程限流 🔒
- [ ] 写 inquiries(Local API 内部写入,匿名 REST/GraphQL 皆拒)🔒
- [ ] `afterChange` 原子入队(同 `req`/同事务)→ worker 发邮件+短信;幂等键 `inquiryId+channel`;至少一次 🔒
- [ ] 部署 job runner(worker / `autoRun` / 受保护 cron)
- **✅ 验证**:匿名 REST+GraphQL 创建被拒不发通知;真实提交入库+邮件+短信;失败/重复/重启不漏不重

## 阶段 6 · SEO 与打磨
- [ ] `sitemap.ts` / `robots.ts` / hreflang(只输出真译文语言)🔒
- [ ] 各页 metadata/OG;JSON-LD;staging `noindex`;统计从 settings 注入(固定脚本 + CSP)🔒
- **✅ 验证**:Lighthouse 性能/SEO/可访问性 ≥ 90;分享卡片正常

## 阶段 7 · 部署上线
> 可构建产物已落地并本地验证;外部/凭据/法务项与遗留加固见 [`go-live-checklist.md`](go-live-checklist.md)。
- [x] Dockerfile 多阶段 + docker-compose(postgres + 一次性 migrate + app + worker)+ `.dockerignore`
- [x] 迁移:`push` 按环境分档(生产 `push:false`)+ 初始迁移提交;空库 `migrate` 干净应用 🔒
      · 部署 `migrate`(单实例 release job,staging 预演,expand/migrate/contract)→ 清单 B
- [x] 生产 worker:`pnpm worker`(`payload jobs:run --cron` 内建循环 drain outbox)
- [x] CI:install → eslint → tsc → test:int → `next build` → 空库全迁移 → schema 漂移检测 🔒
- [x] 首个管理员抢注防护:`ensureAdmin` 脚本 + compose release job 于暴露 `/admin` 前建好首管理员 🔒
- [ ] 备份:`pg_dump` 定时 + OSS 冗余 + 恢复演练 → 清单 E
- [ ] PIPL:隐私页上线门禁、留存删除任务、数据主体权利渠道、第三方/跨境 🔒 → 清单 D
- [ ] 公安联网备案(30 日内,页脚展示号)🔒 → 清单 D
- [ ] 外部凭据接线:OSS 私有桶+签名 / SMTP / 短信 / CDN 🔒 → 清单 C
- [ ] 遗留加固:严格 nonce CSP / stale-job 看门狗 / TRUSTED_IP_HEADER 强制 → 清单 F
- **✅ 验证**:一键起、迁移可执行(已本地验证)、备份可恢复;全新库部署无匿名抢注空窗(已验证幂等 bootstrap)

---

## 开工前待办(不阻塞脚手架)
- [ ] 真实品牌名 + Logo(替换占位「显影 GRAIN」)
- [ ] 字体授权确认(阿里巴巴普惠体免费可商用)
