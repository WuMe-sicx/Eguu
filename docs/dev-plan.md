# 国际广告公司官网 MVP · 开发文档

> 状态:**Codex 终审 ✅ PASS · 决策全定,可开工**（3 轮修订闭合 29 项 + #11 媒体=私有签名,见 §18）
> 技术底座:Next.js（App Router）+ Tailwind CSS + Payload CMS 3 + PostgreSQL + 对象存储（S3 兼容）+ Docker
> 核心约束:国际化(中/英)、简洁高端、突出案例、响应式、深/浅主题、图片视频快、前后台便于二次开发

---

## 0. 范围确认

**本期做**:首页、案例、服务、关于、新闻、联系、中英双语、后台管理(管理员登录 + 内容管理 + 草稿发布 + SEO + 排序 + 图片上传)。

**本期不做**(架构预留,二期可加):会员系统 / 前台客户登录、在线支付、复杂审批流、CRM、招聘投递、多办公室管理。

> ⚠️ 与前面对话的差异:前台**客户注册登录**属于「会员系统」,本期**不做**,只做**管理员登录**。这样更贴合 MVP,也更省。

**email + sms 的用途(本期)**:「项目咨询表单」提交后 → 邮件 + 短信通知你/销售,避免漏线索;管理员找回密码用邮件。不做面向客户的账号邮件。

---

## 1. 技术方案

### 1.1 核心决策:前台 + 后台是**同一个 Next.js 项目**
Payload 3 是 Next.js 原生框架,装进同一个 `app/` 目录,用路由组隔离。**一个仓库、一个镜像**,共享 TypeScript 类型,部署运维都只有一套。

```
app/
├─ (payload)/        # 后台:脚手架生成的 admin / REST / GraphQL 各独立路由(非运行时"自动生成")
└─ (frontend)/       # 前台:官网页面
```

### 1.2 技术栈与选型理由

| 层 | 选型 | 说明 |
|---|---|---|
| 框架 | **Next.js + React + TypeScript**(App Router) | 前台 SSR/SSG + 后台一体;**锁定 Payload 官方支持的 Next patch 范围**,`@payloadcms/*` 版本一致并提交 lockfile |
| 样式 | **Tailwind CSS** | 快速实现简洁高端、响应式、深浅主题 |
| CMS/后台 | **Payload 3** | 代码定义模型,自带管理面板、REST/GraphQL、权限、认证 |
| 数据库 | **PostgreSQL** | `@payloadcms/db-postgres`,填 `DATABASE_URL` |
| 对象存储 | **阿里云 OSS / 腾讯云 COS**(S3 兼容,填 `endpoint`) | `@payloadcms/storage-s3`,图片视频不落本地磁盘;**绑定自有域名需备案** |
| 富文本 | **Lexical**(Payload 默认) | 案例介绍、新闻正文 |
| 国际化 | **Payload localization**(字段级) | 一条内容存中英两份,后台切换语言维护 |
| SEO | **`@payloadcms/plugin-seo`** | 每个内容加 meta 标题/描述/OG 图 |
| 邮件 | **`@payloadcms/email-nodemailer` + SMTP**(阿里云邮件推送 / 腾讯企业邮) | 表单通知、管理员找回密码 |
| 短信 | **阿里云短信 / 腾讯云短信** | 表单提交后通知;**需短信签名 + 模板报备** |
| 部署 | **Docker 多阶段 + docker-compose**(app + postgres)+ CDN | 云服务器 |

### 1.3 国际化方案(关键)
- **后台**:`payload.config` 里 `localization: { locales: ['zh','en'], defaultLocale: 'zh', fallback: true }`;需要双语的字段标 `localized: true`。一条案例只有一条记录,中英各存一份,后台右上角切语言即可分别维护(还带「从某语言复制」按钮)。
- **前台**:App Router `[locale]` 路由段(`zh` 默认 / `en`),中间件识别/默认跳转到 `zh`;取数时 `getPayload().find({ collection, locale })` 传当前语言。
- **SEO**:输出 `hreflang` 中英互链 + 各语言独立 metadata。

### 1.4 图片/视频加载
- 图片走 `next/image`(响应式 `sizes`、懒加载、模糊占位),`remotePatterns` 指向对象存储/CDN 域名。
- 视频:对象存储放 mp4 + 海报图(poster),懒加载,首屏不自动拉大文件。
- **对象存储前置 CDN**(R2 自带 / OSS+CDN),静态资源就近分发。

### 1.5 深/浅主题
- CSS 变量定义品牌色 + 中性色两套,`data-theme` 切换,默认跟随系统 `prefers-color-scheme`,导航栏提供手动切换。品牌主色在 `site-settings` 全局里可配。

---

## 2. 数据模型

> 约定:内容型集合默认开 `versions: { drafts: true }`(自动加 `_status` 草稿/已发布)、`orderable`(拖拽排序)、SEO 插件、双语字段 `localized: true`。
> **slug 不双语**:中英共用同一 slug(路由简单、`generateStaticParams` 每语言复用同一份);要极致 SEO 再改双 slug。**cases/services/news 复用同一 slug 字段**:必填/唯一/索引/`^[a-z0-9-]+$`/规范化/避保留字。

### 2.1 Collections(多条记录)

**`admins`**(认证 · 后台账号)
- 内置 auth,`admin: { user: 'admins' }` 限定只有这张表能进后台。
- 字段:`name`、`email`、`roles`(select:`admin` / `editor`,`saveToJWT: true` 才进 token)。
- 权限:仅 `admin` 可增删账号;**`roles` 字段级 `access.update` 限 admin**(否则 editor 自助更新时能把自己改成 admin 提权);editor 自助只改姓名/邮箱/密码白名单。
- **降权即失权**:保持 `useSessions:true`,角色变更时**在同一写操作内撤销目标账号全部 session**(不靠 JWT 自然过期);测试"admin 降为 editor 后旧 cookie 调 admin-only API 立即 403"。

**`media`**(上传 → 对象存储)
- `upload` + `s3Storage` 适配器;字段:`alt`(localized)、自动尺寸变体(缩略/中/大)。
- **上传约束**:MIME 白名单(图片/视频类型)+ 像素/文件大小上限 + 视频扩展名与真实 MIME 校验。
- **未发布素材保密**(广告业客户创意敏感):**已定 → 私有 bucket + 签名访问**(`s3Storage` 的 `signedDownloads`,见 §18);已发布作品可公开 CDN,草稿/未发布素材走签名 URL。

**`cases`**(案例)
- `title`✱、`slug`(必填/唯一/`^[a-z0-9-]+$`/避保留字)、`client`(客户名)✱、`services`(关系 → services,多选,标"服务类型")、`cover`(→ media)、`gallery`(图集,→ media 数组)、`videoType`(自托管 / 嵌入,**互斥校验**)+ `video`(自托管:→ media 短片限大小 / 嵌入:仅腾讯视频·Bilibili 的**视频 ID/域名白名单**,不存任意 embed HTML)、`intro`(富文本项目介绍)✱、`meta`(SEO 插件)。
- 开 drafts + orderable。
- 首页精选由 `home.featuredCases` 显式挑选(§2.2),**cases 不设 `featured` 布尔**,避免双数据源。

**`services`**(服务)
- `title`✱、`slug`(必填/唯一/格式校验,同 §约定)、`icon`/`cover`(→ media)、`summary`✱、`detail`(富文本)✱、`meta`。
- 开 drafts + orderable。

**`news`**(新闻)
- `title`✱、`slug`(必填/唯一/格式校验)、`cover`(→ media)、`excerpt`✱(摘要)、`body`✱(富文本)、`publishedAt`(日期,**发布时必填**)、`meta`。
- 开 drafts;按 `publishedAt` 倒序。

**`inquiries`**(项目咨询提交 · **不双语、不草稿**)
- `name`、`email`、`phone`、`company`、`serviceInterest`(关系 → services,可空)、`message`、`consent`(同意隐私政策,**必填**,见 §16)、`localeFrom`(来源语言)、`createdAt`。
- `afterChange` 钩子:新建时**原子入队**通知任务(同事务),邮件/短信由 worker 发送(见 §10)。
- 权限:**`inquiries.access.create` 仅允许已认证 admin**(access 同时作用于 REST 与 GraphQL → 匿名 `POST /api/inquiries` 与匿名 GraphQL `createInquiry` 都被拒,不能绕过防刷触发短信)。前台仅经 Server Action 校验后用 Local API(`overrideAccess:true`)受控内部写入;后台 `admins` 可读,前台不可读列表。

✱ = 需要双语(`localized: true`)。

### 2.2 Globals(单例内容)

**`site-settings`**:Logo、站点名、主导航、页脚、社交链接、品牌主色、默认 SEO、默认 OG 图、**统计配置**(结构化:供应商 + 站点/测量 ID 且**按供应商格式白名单校验**,**不存任意 HTML/JS**,代码生成固定脚本,仅 admin 可改 + CSP)。
**`home`**:主视觉(标题/副标/背景图或视频/CTA,双语)、公司简介(双语)、精选服务(关系挑选)、精选案例(**关系显式挑选 + 可排序**,比只靠 `cases.featured` 更可控)、联系入口 CTA。("最新新闻"直接取 news 最新 N 条,不用配。)
**`about`**:公司介绍(双语富文本)、团队(array:头像/姓名/职位/简介)、客户品牌(array:logo/名称)、奖项(array:年份/奖项名/说明)。
**`contact`**:联系方式(邮箱/电话)、办公地址(本期单一,双语)、**地图(仅结构化坐标 + 地图供应商 + 域名白名单 URL,不存/渲染任意 embed HTML)**、社媒。

> **默认取舍**:团队/客户品牌/奖项本期做成 `about` 全局里的 **array**(录入快、字段少)。若二期要独立页面或复杂排序,再升级为独立 collection。
> **globals 草稿**:`home` / `about` / `contact` 开 `versions:{drafts:true}`(先存草稿+预览再发布,别一改就对外);`site-settings` 即时生效但仅 admin 可改。

### 2.3 关系图(简)
```
home ──选──> services / cases
cases ──关系──> services (服务类型)
cases/services/news ──> media (封面/图集/视频)
inquiries ──可选──> services
about(团队/客户/奖项 = 内嵌 array)
```

---

## 3. 页面结构

### 3.1 路由树
```
app/
├─ (payload)/                      # 脚手架生成(勿手改):admin / REST / GraphQL 各自独立路由
│  ├─ admin/[[...segments]]/       # + importMap
│  ├─ api/[...slug]/route.ts       # REST
│  ├─ api/graphql/route.ts         # GraphQL(独立路由,非 REST 附属)
│  └─ api/graphql-playground/
├─ api/preview/ + api/exit-preview/ # 草稿预览鉴权路由(见 §18)
└─ (frontend)/
   └─ [locale]/                    # zh(默认) | en
      ├─ layout.tsx                # 导航 + 页脚 + 主题 + 语言切换
      ├─ page.tsx                  # ① 首页
      ├─ work/
      │  ├─ page.tsx               # ② 案例列表
      │  └─ [slug]/page.tsx        # ② 案例详情
      ├─ services/
      │  ├─ page.tsx               # ③ 服务列表
      │  └─ [slug]/page.tsx        # ③ 服务详情
      ├─ about/page.tsx            # ④ 关于
      ├─ news/
      │  ├─ page.tsx               # ⑤ 新闻列表
      │  └─ [slug]/page.tsx        # ⑤ 新闻详情
      ├─ contact/page.tsx          # ⑥ 联系(含咨询表单)
      └─ privacy/page.tsx          # ⑦ 隐私政策(PIPL 必需,页脚固定入口)
middleware.ts                       # 语言识别 / 默认跳转
```

### 3.2 各页内容块
- **首页**:主视觉 → 公司简介 → 核心服务(取 services) → 精选案例(**唯一来源 `home.featuredCases`,按其顺序**) → 最新新闻(news 最新 N) → 联系 CTA。
- **案例列表**:网格卡片(封面/客户/服务类型),可按服务类型筛选 + 分页;**详情**:封面/图集/视频 + 客户名 + 服务类型 + 项目介绍 + 相关案例。
- **服务列表**:卡片;**详情**:服务介绍 + 相关案例。
- **关于**:公司介绍 + 团队 + 客户品牌墙 + 奖项。
- **新闻列表**:按发布时间倒序,分页;**详情**:文章正文 + 分享 + 相关新闻。
- **联系**:联系方式 + 办公地址/地图 + **项目咨询表单**(Server Action 提交 → 写 `inquiries` → 触发邮件+短信;含防刷:honeypot + 频率限制)。

### 3.3 全站组件
导航栏(响应式菜单 + 语言切换 + 主题切换)、页脚、SEO 组件(metadata + hreflang + OG)、图片/视频封装、富文本渲染器。

---

## 4. 实施步骤(分阶段,每阶段留验证点)

**阶段 0 · 脚手架与基础设施**
- **空白 `create-payload-app`(blank 模板)** 起步,手搭 6 集合(不用官方 website 重模板,保结构清晰);接 Postgres、`.env`、S3 存储、Email、Tailwind。
- Postgres 适配器 dev 设 `push:true`,生产 `push:false`(迁移见 §17)。
- ✅ 验证:`/admin` 能打开并创建第一个管理员;能上传一张图并落到对象存储。

**阶段 1 · 数据模型**
- 建全部 collections + globals;配 localization(en/zh)、drafts、orderable、SEO 插件、access(admins 角色权限)。生成 TS 类型。
- ✅ 验证:后台能对每类内容做中英双语录入、存草稿、发布、拖拽排序、填 SEO。

**阶段 2 · 后台可用 + 样例数据**
- 完善权限(admin/editor)、媒体变体、字段校验;录入一批中英样例内容。
- ✅ 验证:非技术同事能独立完成"新增一个案例(中英)并发布"。

**阶段 3 · 前台骨架**
- `[locale]` 路由 + 中间件、根 layout(导航/页脚/主题/语言切换)、主题变量、统一取数封装(`getPayload` + locale)。
- ✅ 验证:中英切换、深浅切换、导航跑通;空页面响应式无横向滚动。

**阶段 4 · 前台页面**
- 逐页实现:首页 → 案例列表/详情 → 服务 → 关于 → 新闻 → 联系 → **隐私政策(中英,页脚入口)**。接图片/视频优化(next/image、CDN、poster、懒加载)。
- ✅ 验证:各页电脑/手机两档视觉达标,案例作品突出,图片视频加载顺畅。

**阶段 5 · 表单与通知**
- 联系表单 Server Action(防刷)→ 写 `inquiries`;`afterChange` **原子入队**,worker 发**邮件 + 短信**;部署 job runner。
- ✅ 验证:真实提交后,邮箱收到通知、手机收到短信、后台出现记录。

**阶段 6 · SEO 与打磨**
- `sitemap.xml`、`robots.txt`、中英 `hreflang`、各页 metadata/OG;Lighthouse 跑性能与可访问性。
- ✅ 验证:Lighthouse 性能/SEO/可访问性达标;分享卡片正常。

**阶段 7 · 部署上线**
- Dockerfile 多阶段 + docker-compose(app + postgres);部署前 `migrate:create` 生成迁移并提交,部署时跑 `payload migrate`(生产 `push:false`);CDN 前置;备份(均见 §17)。
- **国内合规**:ICP 备案 ✅、短信签名/模板 ✅;**公安联网备案待办**(开通 30 日内办理,页脚展示备案号);确认服务器/站点域名/对象存储绑定域名都在备案覆盖内。
- ✅ 验证:云服务器全流程跑通,备份可恢复。

---

## 5. 环境变量(清单)
```
DATABASE_URL=            # Postgres 连接串
PAYLOAD_SECRET=          # Payload 密钥
# 对象存储(阿里云 OSS / 腾讯云 COS,S3 兼容)
S3_BUCKET= S3_REGION= S3_ENDPOINT= S3_ACCESS_KEY_ID= S3_SECRET_ACCESS_KEY=
# 邮件(阿里云邮件推送 / 腾讯企业邮 SMTP)
SMTP_HOST= SMTP_PORT= SMTP_USER= SMTP_PASS= MAIL_FROM=
# 短信(阿里云/腾讯云)
SMS_ACCESS_KEY= SMS_SECRET= SMS_SIGN_NAME= SMS_TEMPLATE_ID= NOTIFY_PHONE= NOTIFY_EMAIL=
PREVIEW_SECRET=          # 草稿预览独立密钥(见 §18)
NEXT_PUBLIC_SERVER_URL=  # 站点域名(国内服务器 + 域名需 ICP 备案)
```

## 6. 已确认决策
1. **区域**:主要面向中国 → 云服务器 + 域名走**国内 + ICP 备案**。
2. **对象存储**:阿里云 OSS / 腾讯云 COS(S3 兼容)。
3. **邮件 / 短信**:阿里云邮件推送(SMTP)+ 阿里云/腾讯云短信(需签名 + 模板报备)。
4. **默认语言**:`zh`(中文默认,英文可切)。
5. **团队/客户/奖项**:先内嵌进 About 全局(array),二期需要再升级为独立集合。
6. **媒体保密**:私有 bucket + 签名访问;已发布作品公开 CDN,草稿素材走签名 URL。

**品牌视觉**:方向已定(§19,电影级/深色/作品优先,主色**浅蓝 `#5CC8FF`**),示意稿见 Artifact。**仍待你补充(不阻塞开工)**:真实品牌名 + Logo、字体授权(阿里巴巴普惠体免费可商用)。

> ✅ ICP 备案、短信签名/模板报备已完成。**注意**:公安联网备案仍待办(§16/§17),别据此推定"全部合规完成"。

---

## 7. 项目目录结构(便于二次开发)

```
egouu/
├─ src/
│  ├─ app/
│  │  ├─ (payload)/                 # 脚手架生成(以实际 blank 模板为准),勿手改
│  │  │  ├─ admin/[[...segments]]/  # + importMap.js
│  │  │  ├─ api/[...slug]/route.ts  # REST
│  │  │  ├─ api/graphql/route.ts    # GraphQL(独立)
│  │  │  └─ layout.tsx
│  │  └─ (frontend)/
│  │     └─ [locale]/               # zh(默认)| en
│  │        ├─ layout.tsx           # 导航/页脚/主题/语言切换
│  │        ├─ page.tsx             # 首页
│  │        ├─ work/  (+ [slug])    # 案例列表/详情
│  │        ├─ services/ (+ [slug]) # 服务列表/详情
│  │        ├─ about/page.tsx
│  │        ├─ news/  (+ [slug])
│  │        ├─ contact/page.tsx
│  │        └─ privacy/page.tsx     # PIPL 隐私政策
│  ├─ collections/                  # 每个集合一个文件
│  │  ├─ Admins.ts  Media.ts  Cases.ts  Services.ts  News.ts  Inquiries.ts
│  ├─ globals/                      # SiteSettings / Home / About / Contact
│  ├─ fields/                       # 复用字段(slug、seo 包装、localized 文本)
│  ├─ hooks/                        # inquiries afterChange → 邮件/短信
│  ├─ access/                       # 访问控制(isAdmin、isAdminOrSelf、publishedOnly)
│  ├─ lib/                          # getPayload 封装、取数、通知服务、限流
│  ├─ i18n/                         # UI 静态文案字典 zh/en + locale 配置
│  ├─ components/                   # 前台组件(卡片/富文本渲染/媒体/表单)
│  └─ payload.config.ts
├─ public/
├─ docker/                          # Dockerfile、docker-compose.yml
├─ next.config.js                   # images.remotePatterns → OSS/CDN 域名
├─ .env.example
└─ package.json
```

> 约定:**集合/全局每个一个文件**,字段和访问控制拆到 `fields/`、`access/` 复用 —— 二次开发加内容类型时,复制一个集合文件改字段即可。

---

## 8. 访问控制矩阵

角色(`admins.roles`):`admin`(全权)/ `editor`(只管内容)。read「公开」一律**只暴露 `_status=published`**,草稿不外泄。

| 集合 | create | read | update | delete |
|---|---|---|---|---|
| `admins` | admin | 登录用户 | 本人(仅姓名/邮箱/密码)或 admin;`roles` 字段级仅 admin | admin |
| `media` | 登录 | 公开 | 登录 | admin |
| `cases` / `services` / `news` | editor+ | 公开(仅已发布) | editor+ | admin |
| `inquiries` | `access.create` 仅 admin(**REST+GraphQL 皆拒匿名**);仅 Server Action 内部写入 | admin/editor | — | admin |
| globals `home`/`about`/`contact` | — | 公开 | editor+ | — |
| global `site-settings` | — | 公开 | **仅 admin** | — |

---

## 9. 国际化实现细节

- **两类文案分开**:内容型(案例/服务/新闻…)存 Payload,靠字段 `localized:true`;**UI 静态文案**(按钮、导航、表单占位)放 `src/i18n/{zh,en}.ts` 字典,不进数据库。
- **middleware**:按路径前缀定位 locale;无前缀 → 重定向到默认 `/zh`。
- **每页 `generateMetadata`** 输出对应语言 title/description + `alternates.languages`(hreflang `zh` / `en` / `x-default`)。
- 取数统一传 `locale`;`fallback:true` 时某语言缺字段回退默认语言,避免前台空白。
- **发布状态非按语言区分**:Payload 单一 `_status`,发布即中英同"已发布",`fallback` 会让英文页显示中文。**MVP 决策**:保持单状态,但**发布前校验中英必填**;sitemap/hreflang 只声明真有译文的语言(不采用 beta 的 `localizeStatus`)。

---

## 10. 联系表单与通知流程

```
前台表单 (Server Action)
  → 校验(zod) + 防刷(honeypot 空字段 + 同 IP 限流 + 提交时间戳)
  → payload.create({ collection:'inquiries', data, req })   // 同事务
  → Inquiries.afterChange:仅入队 durable job(传同一 req,同事务)
  → 返回成功,前台提示
  ── worker(独立 runner)──
       ├─ 邮件(SMTP) → NOTIFY_EMAIL      (独立状态/重试/幂等)
       └─ 短信(阿里云/腾讯云) → NOTIFY_PHONE
```

- 通知放**集合钩子**而非表单处理器 → 任何来源新增 inquiry 都会通知,逻辑集中一处。
- **原子入队**:`afterChange` 只 `await` 创建 durable job/outbox 并**传入同一 `req`**,使 job 与 inquiry 落在**同一 Postgres 事务**(先提交 inquiry 再排队若崩溃仍漏)。邮件/短信只由 **worker** 执行:每通道独立记状态+错误+重试(退避),幂等键用 **`inquiryId + channel`**(供应商支持则透传其幂等请求键),保存供应商 request ID 供对账;失败告警 + 可人工补发;发送失败不回滚 inquiry(线索优先)。
- **投递语义**:对外邮件/短信为**至少一次投递 + 尽量抑制重复**(exactly-once 外部不可保证),别承诺"绝不重复"。
- **部署 worker**:队列必须有 runner 才执行 —— 配单独 worker / `autoRun` / 受保护 cron(见 §17)。
- 防刷:honeypot + 每 IP 限流 + 时间校验;MVP 不上验证码,量大再加。
- **可信 IP**:只信任指定 CDN/反代注入的客户端 IP 头,入口**覆盖外部同名 `X-Forwarded-For`**(防伪造轮换)。
- **限流存储**:用**跨进程持久存储**(Postgres/Redis),非纯内存(重启/多实例可绕过);定义窗口、阈值、失败响应、过期清理。测试直接调 Server Action:伪造转发头、临界次数、窗口恢复、并发提交。
- 邮件送达:发信域名配 **SPF/DKIM**,避免通知进垃圾箱。

---

## 11. 前台取数与缓存

- 用 Payload **Local API**(`getPayload({ config })` + `.find/.findByID`),同进程直连,不走 HTTP。
- ⚠️ **查询分四种分支**(Local API 默认 `overrideAccess:true` 会跳过 access,按场景显式设定):
  - 公开 collection:`draft:false` + `overrideAccess:false` + `where:{ _status:{ equals:'published' } }`。
  - 公开 global(home/about/contact):`draft:false` + `overrideAccess:false`(由 global access 控制,globals 不支持 `where`)。
  - 预览 collection(已过 §18 鉴权建立 draftMode):`draft:true` + `overrideAccess:true`,**不加 published 条件**(否则未发布新草稿被过滤 → 预览 404)。
  - 预览 global:`draft:true` + `overrideAccess:true`。
  - 预览分支安全边界依赖 §18 的 secret + 管理员认证建立的 HttpOnly draft cookie。
- 列表/详情默认 **SSG + ISR**(`revalidate`);`generateStaticParams` 预生成中英各语言 slug。
- 内容发布后按需 `revalidatePath`(MVP 可先用定时 revalidate)。
- **草稿预览**(完整鉴权协议见 §18):`/api/preview` 校验 `PREVIEW_SECRET` **且** Payload cookie 确认管理员 → 校验 collection + 相对路径白名单(拒外链,防开放重定向)→ 开 HttpOnly `draftMode()` cookie 跳目标页 → 目标页仅在 draftMode 下 `draft:true` 读草稿;`/api/exit-preview` 退出。非预览下草稿/不存在 slug → `notFound()`。

---

## 12. SEO 与站点地图

- `sitemap.ts` 输出中英全部页面(含 `alternates`);`robots.ts` 允许抓取并指向 sitemap。
- 每页 metadata 取自 SEO 插件 `meta` 字段,缺失回退 `site-settings` 默认。
- 案例/新闻加 JSON-LD 结构化数据(CreativeWork / Article);OG 图用 `meta.image`,无则默认。
- **staging 环境全站 `noindex`**,防预发布被收录;统计由代码按 `site-settings` 供应商+ID 生成固定脚本注入(非任意代码,防持久化 XSS)+ CSP。
- **sitemap/hreflang 只输出真实有译文的语言**,不把中文回退页当独立英文页声明(见 §9 发布状态)。

---

## 13. 媒体与性能

- Media 配尺寸变体(thumbnail / card / hero),`next/image` 按 `sizes` 取档;首屏 hero `priority`,其余懒加载 + 模糊占位。
- 视频:OSS 存 mp4 + poster;`<video preload="none" poster>`,首屏不自动拉大文件;限制上传大小,超大视频约定分辨率(二期可上 HLS)。
- OSS 绑 CDN,静态资源长缓存 + 文件名带 hash;`next.config.js` 的 `remotePatterns` 指向 CDN 域名。

---

## 14. 验收标准(DoD)

- **后台**:非技术同事能独立"新增案例(中英)+ 上传图/视频 + 存草稿 + **预览草稿** + 发布 + 拖拽排序 + 填 SEO"。
- **前台**:7 类页面(含隐私政策,页脚入口)桌面/移动两档正常;中英切换、深浅切换正常;无横向滚动。
- **表单**:未勾选隐私同意不可提交;匿名 `POST /api/inquiries` **与** 匿名 GraphQL `createInquiry` 都必须失败且不创建记录/不发通知;真实提交 → 入库 + 邮件到 + 短信到;单通道失败可重试、进程重启不漏投递(至少一次,幂等键 `inquiryId+channel` 抑制重复)。
- **性能**:关键页 Lighthouse 性能 / SEO / 可访问性 ≥ 90。
- **部署**:docker-compose 一键起,`payload migrate` 可执行,备份可恢复。

---

## 15. 风险与依赖

- **富文本排版**:Lexical 默认够用,正文内嵌图开 upload feature(存 media);复杂图文混排需自定义 block(按需再加)。
- **视频体积**:影响加载与存储成本 → 限制上传大小 + 约定分辨率,必要时转码。
- **短信费用/风控**:仅内部通知,量可控;注意频率与计费。
- **本地开发存储**:本地用 MinIO 或独立测试 bucket,勿污染生产。

---

## 16. 合规与隐私(PIPL)

表单收集姓名/手机/邮箱属**个人信息**,国内站强制合规(PIPL 第 17/15/47/50 条):
- **隐私政策页** `/[locale]/privacy`(中英),页脚固定入口,**上线门禁项**;写明:收集项、目的、方式、留存期、受托方、数据主体权利与行使渠道、负责人联系方式。
- **表单同意勾选**(`inquiries.consent` 必填,默认不勾),未勾不可提交;文案链到隐私政策;记录同意时间/版本。
- **留存与删除(确定规则,非"建议")**:留存期 **12 个月**;到期删除**同步清理 inquiry 及其 job/outbox payload、含个人数据的应用日志**;通知 job 只带 inquiry ID、发送时短暂读取;审计记录只留**不可回溯个人**的时间/原因/数量/结果;恢复旧备份后重跑删除/tombstone;约定第三方(SMTP/短信)保留策略。
- **数据主体权利**:提供撤回同意 / 查询 / 更正 / 删除的申请渠道(邮箱即可),约定响应时限。
- **受托方与跨境**:列明 SMTP、短信、统计等第三方处理者及其数据项;**统计若用 GA 等境外服务需单独评估跨境传输与告知/同意**,国内默认优先百度统计。
- **访问控制**:inquiries 仅 admin/editor 可读(§8),禁匿名 REST(§18)。
- 已完成:ICP 备案 ✅、短信签名/模板报备 ✅。**待办:公安联网备案**(开通 30 日内办理并页脚展示备案号,见 §17)。

## 17. 迁移与运维

- **数据库迁移**(Payload + Postgres,官方流程已核实):
  - dev 用 `push:true`,Drizzle 自动同步本地库,**不要**对本地库跑 migrate(会警告)。
  - 改 schema 后 → `payload migrate:create <name>` 生成迁移文件并**提交进 git**。
  - 生产 `push:false`,部署时跑 `payload migrate`(**独立、单实例 release job**,并发部署只执行一次)。
  - **发布保护**:先在 staging/生产结构副本预演迁移 + 冒烟,成功才切应用;失败即阻止发布;破坏性变更用 expand → migrate → contract 分步。
  - ⚠️ 生产用 push 或跳过迁移 = **丢数据/读写报错**,务必走迁移。
- **备份**:`pg_dump` 每日定时 + 保留多份;对象存储开版本控制/跨区冗余;**每季一次恢复演练**(没演练过 = 没备份)。
- **通知 worker**:部署独立 job runner(或 `autoRun`/受保护 cron)执行 outbox,含重试退避与失败告警;无 runner 队列永不执行。
- **测试/CI 门禁**(呼应团队规范:lint+type+test 才提交):
  - CI:锁定安装 → `eslint` → `tsc --noEmit` → 测试 → `next build`;临时空 Postgres 跑**全部 migration** 再跑集成测试;检查无未提交 schema diff。
  - 高危项集成测试(对应 §18):角色提权 + 降权后旧 session 立即失效、REST/**GraphQL**/Local API 草稿不可见(含未发布新草稿预览成功)、预览未授权/非法路径、匿名 REST+GraphQL 创建 inquiry 被拒且不发通知、限流边界、通知失败/重试/幂等、locale fallback。
- **环境隔离**:staging 与 prod 分离,staging 全站 `noindex`;`.env` 不入库。

---

## 18. 终审修订记录(Codex Review)

Codex 独立终审(SESSION `019f52d8`)首轮 16 + 二轮 8 + 三轮 5 项,已逐条落地。**开工前仍需你拍板 1 项**(#11 媒体保密,阶段 0 门禁)。

| # | 问题 | 严重度 | 处置 |
|---|---|---|---|
| 1 | 匿名创建 inquiry(REST/GraphQL)绕过防刷+触发短信 | 高 | `access.create` 限 admin(拒 REST+GraphQL 匿名);仅 Server Action 内部写入(§2.1/§8) |
| 2 | Local API 默认越过 access → 草稿泄露 | 高 | 查询分公开 collection/公开 global/预览 collection/预览 global 四分支(§11) |
| 3 | roles 字段可自提权 | 高 | `roles` 字段级 update 限 admin + `saveToJWT`;editor 自助仅白名单(§2.1/§8) |
| 4 | 预览 token/身份/跳转未定义 | 高 | PREVIEW_SECRET + 管理员认证 + 相对路径白名单 + HttpOnly draft cookie(下方协议) |
| 5 | PIPL 页面/权利/留存未落地 | 高 | 新增隐私路由 + 确定留存删除 + 数据主体权利 + 第三方/跨境(§16、路由树、DoD) |
| 6 | 统计注入位=持久化 XSS | 中高 | 改结构化字段(供应商+ID)admin-only + CSP(§2.2/§12) |
| 7 | globals 无草稿发布 | 中 | home/about/contact 开 drafts,settings 即时(§2.2) |
| 8 | 双语发布状态假设 | 中 | 单 `_status` + 发布前中英必填;sitemap/hreflang 只输出真译文(§9) |
| 9 | 精选案例双数据源 | 中 | 唯一来源 `home.featuredCases`,删 `cases.featured`(§2.1/§3.2) |
| 10 | 通知非必达 + 缺 NOTIFY_EMAIL | 中 | 加 NOTIFY_EMAIL;异步 outbox + 幂等键 + 每通道状态(§10/§5) |
| 11 | 媒体公开泄露未发布素材 | 中 | 加 MIME/大小限制;**未发布保密策略待拍板**(§2.1) |
| 12 | 路由目录不全 + 未锁版本 | 中 | 列独立 REST/GraphQL/admin 路由;锁 Next/Payload 版本 + lockfile(§1/§3/§7) |
| 13 | slug/publishedAt/视频嵌入边界 | 中 | slug 必填唯一格式;publishedAt 发布必填;视频白名单不存 embed HTML(§2.1) |
| 14 | CI 门禁不足 | 中 | 加 next build + 迁移可应用 + 高危项集成测试(§17) |
| 15 | 迁移生产保护不足 | 中 | 独立单实例 release job + staging 预演 + expand/migrate/contract(§17) |
| 16 | 漏公安联网备案 | 中 | 加入上线清单(§16/§17/阶段7) |

**草稿预览鉴权协议**(对应 #4):`/api/preview?secret=…&collection=…&path=…` → 校验 `PREVIEW_SECRET` 且 Payload cookie 确认管理员 → 校验 collection + 相对 path 白名单(拒外链)→ 开 HttpOnly draftMode cookie 跳目标 → 目标页 draftMode 时才 `draft:true`;`/api/exit-preview` 退出。

**#11 已定(阶段 0 门禁)**:未发布案例图片/视频**不接受公开直达 → 私有 bucket + 签名访问**(`@payloadcms/storage-s3` 的 `signedDownloads`)。已发布作品走公开 CDN,草稿/未发布素材走签名 URL;阶段 0 按此配置 bucket ACL。

---

## 19. 品牌视觉(Brand Visual)

方向:**电影级 · 深色优先 · 作品即主角**(参考影视飓风 ysjf.com 的视觉 DNA,视觉为原创)。示意稿见 Artifact(占位品牌「显影 GRAIN」/占位影像,可替换)。

### 色彩(冷调中性,偏 accent)
| Token | 深色(主) | 浅色(副) | 用途 |
|---|---|---|---|
| `bg` | `#0A0C10` | `#EDF1F6` | 底 |
| `bg-2` | `#12161C` | `#F7F9FC` | 卡片/次级面 |
| `fg` | `#EAEEF3` | `#0F1720` | 正文 |
| `fg-muted` | `#7E8894` | `#586372` | 次要文字/元数据 |
| `accent` | `#5CC8FF`(浅蓝) | `#0E70A8`(深一档,过 AA) | 唯一高能色,仅点睛 |

- **主色浅蓝**:深色底用亮浅蓝 `#5CC8FF`,浅色底自动加深到 `#0E70A8`(对浅底 ≈4.7:1、白字 CTA ≈5.4:1,过 AA)。中性色**偏冷**(跟随 accent),非纯灰。
- **一个 accent,克制使用**(标记/hover/关键 CTA),其余近单色让作品出彩;深色为主、浅色为副(呼应 §1.5)。

### 字体
- 显示体:重体大标题(真站用**阿里巴巴普惠体 Heavy / 思源黑体 Heavy**;示意用系统 PingFang),大字号 + 紧字距。
- 正文:同族常规;**等宽体做元数据标签**(案例编号、服务 tag、时码/SCROLL——片场质感,呼应影像)。
- 中英混排;标题 `text-wrap:balance`,标签加字距。

### 版式与动效
- **满屏主视觉**:作品视频铺底(poster + 懒加载,呼应 §13),压一句风格化标语,极简透明导航(滚动转实底)。
- **作品网格**:大图非对称,hover 放大 + 揭示(客户/服务/年份),作品优先。
- **服务**:动线式大字列表,hover 位移 + accent。
- 页脚极简双语,含**隐私政策 + ICP + 公安备案号**(呼应 §16)。
- 动效克制:主视觉装配式入场、滚动揭示、hover 微交互、颗粒质感;**尊重 `prefers-reduced-motion`**。

### 占位与待定
- 占位(均待替换):品牌名「显影 GRAIN」、口号「制造注意力 / MAKE THEM LOOK」、案例影像。
- 待你定:真实品牌名(wordmark)+ 是否已有 Logo、是否沿用熔岩橙 accent(可换电光蓝/柠檬绿等)。
```
