# 上线清单(Go-Live)

> 依据 [`dev-plan.md`](dev-plan.md) §13/§14/§16/§17。阶段7 的**可构建产物已落地并本地验证**(见「已就绪」);
> 本清单收拢**需真实云环境/凭据/法务**的动作与**遗留加固**。🔒 = 安全/合规硬项,不得省。

---

## A. 已就绪(阶段7 已落地 + 本地验证)

- [x] `db.push` 按环境分档:dev/test push、**生产 `push:false`**(`src/payload.config.ts`)🔒
- [x] 初始迁移 `src/migrations/20260712_202435_initial`;空库 `payload migrate` 干净应用 + `migrate:status` 全 Yes 🔒
- [x] 生产 worker:`pnpm worker`(`payload jobs:run --cron` 内建 Croner 循环 drain outbox)
- [x] 生产 Dockerfile(全依赖镜像)+ `.dockerignore`
- [x] `docker-compose.yml`:postgres + 一次性 migrate(release job)+ app + worker
- [x] 首个管理员 bootstrap `src/scripts/ensureAdmin.ts`(空库建、已存在 no-op,幂等)🔒
- [x] CI `.github/workflows/ci.yml`:lint→tsc→test:int→build→空库迁移→schema 漂移检测

> 镜像**离线可构建**(next build 不依赖 DB:sitemap 请求时生成,其余取数 `.catch` 兜底)。
> CI `docker` job 已 `docker build` + `docker compose config` 验证;宿主 `docker compose build` 无需先起 DB。

## B. 部署顺序(单机 docker-compose)

1. 准备 `.env`(照 `.env.example`):`DATABASE_URL`(host=`postgres`)、`PAYLOAD_SECRET`、`PREVIEW_SECRET`、`POSTGRES_*`(**密码必填,compose 无默认**)、`ADMIN_EMAIL`/`ADMIN_PASSWORD`、`NEXT_PUBLIC_SERVER_URL`(备案域名)、通知/存储凭据。
2. `docker compose build`
3. `docker compose up -d postgres` → 等 healthy
4. `docker compose up migrate`(一次性):跑 `payload migrate` + `bootstrap:admin`,**成功退出**才继续 🔒
5. `docker compose up -d app worker`
6. 冒烟:`/`、`/admin`(用 bootstrap 管理员登录后**立即改密**)、`/sitemap.xml`、`/robots.txt`、提交一次联系表单 → 确认 worker 发出通知。
- **多机/编排**:migrate 必须**带外单实例**执行一次(不要每个副本都跑),再滚动应用;破坏性变更走 expand→migrate→contract(§17)🔒
- **发布保护**:先在 staging 或生产结构副本预演迁移 + 冒烟,成功才切应用 🔒

## C. 外部依赖 / 凭据(部署前接好)

- [ ] **对象存储** 🔒:`@payloadcms/storage-s3` 私有 bucket + `signedDownloads`(草稿/未发布素材走签名 URL);填 `S3_*`。当前为本地磁盘存储,仅临时。
- [ ] **邮件 SMTP** 🔒:`@payloadcms/email-nodemailer` + `SMTP_*`/`MAIL_FROM`;接入 `src/lib/notify.ts` 的 `sendEmail`(当前配了凭据即抛错占位)。
- [ ] **短信** 🔒:`SMS_*` + 已报备签名/模板;接入 `notify.ts` 的 `sendSms`。
- [ ] **CDN 前置**:静态与已发布媒体走 CDN;CDN/OSS 域走 `NEXT_PUBLIC_MEDIA_HOST`(进 CSP 白名单)。
      ⚠️ 该值**构建期内联**进 CSP(next.config `headers()`),须作为 **build-arg** 传入(compose `build.args` 已接),
      仅在运行时 `.env` 设置**无效**;改域名需重新构建镜像。
- [ ] **可信 IP 头**:反代/CDN 注入单值头,填 `TRUSTED_IP_HEADER`(如 `CF-Connecting-IP`);切勿裸信 `x-forwarded-for`。

## D. 合规(PIPL / 备案)🔒

- [ ] **公安联网备案**:开通 30 日内办理,页脚展示备案号;确认服务器/站点域名/对象存储绑定域名都在 ICP+公安备案覆盖内。(ICP、短信签名/模板已完成。)
- [ ] **PIPL 留存删除**:inquiries 按约定留存期定时删除(定时任务/cron)。
- [ ] **数据主体权利渠道**:隐私页公示访问/更正/删除/撤回同意的联系方式与响应流程。
- [ ] 隐私页 `/[locale]/privacy` 上线可达(已实现);第三方/跨境说明与实际处理一致。

## E. 备份与运维 🔒

- [ ] `pg_dump` 每日定时 + 多份保留;对象存储开版本控制/跨区冗余。
- [ ] **每季一次恢复演练**(没演练过 = 没备份)。
- [ ] 环境隔离:staging 与 prod 分离,staging `NEXT_PUBLIC_SITE_ENV=staging`(全站 noindex + sitemap 空)。
- [ ] worker 失败告警(通道:通知失败/重试耗尽时可感知)。

## F. 遗留加固(需真实域名/威胁模型,阶段5/6 顺延)

- [ ] **严格 nonce CSP**:随部署域名/CDN 落定后,把务实 CSP 收紧为 nonce 版(`src/lib/securityHeaders.ts`)。
- [ ] **stale-job 看门狗**:worker 崩溃/超时导致 job 卡 `processing` 的租约回收或超时重置(当前依赖重试退避)。
- [ ] **`TRUSTED_IP_HEADER` 强制**:生产未配可信头时,限流按更严策略(当前回退单桶 + 告警)。

## G. 验收(DoD §14)

- [ ] docker-compose 一键起;`payload migrate` 可执行;备份可恢复。
- [ ] 全新库部署**无匿名抢注空窗**(bootstrap 先于暴露 /admin)🔒
- [ ] 线上 **Lighthouse 性能/SEO/可访问性 ≥ 90**;分享卡片(OG)正常。
- [ ] 高危项集成测试 CI 全绿(草稿隔离、匿名写拒绝、限流、通知幂等、降权失权等,§18)🔒
