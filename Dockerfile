# 生产镜像:app / migrate / worker 共用同一「全依赖」镜像,靠 compose 覆盖 command 区分。
# 不用 Next output:standalone —— payload CLI(migrate / jobs:run)靠 tsx 转译 TS config,
# 而 tsx 是 devDependency 且 standalone 产物不含 CLI;单机 compose 部署下全依赖镜像更简单正确。
# ponytail: 全依赖镜像(含 dev 依赖)体积偏大;若在意体积,后续可切 standalone + 单独 ops 镜像。
FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat && corepack enable
WORKDIR /app

# deps:装全部依赖(构建需 tailwind/postcss 等 dev 依赖;运行期 payload CLI 需 tsx)
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# builder:构建 Next 产物(.next)
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# NEXT_PUBLIC_* 在构建期被内联进产物(SSG canonical/OG/JSON-LD/noindex/robots host,
# 以及 next.config headers() 的 CSP 媒体域)。运行时 .env 无法改写已生成的静态产物 →
# 必须构建期传入,故镜像按目标环境构建(staging≠prod)。
ARG NEXT_PUBLIC_SERVER_URL
ARG NEXT_PUBLIC_SITE_ENV
ARG NEXT_PUBLIC_MEDIA_HOST
ENV NEXT_PUBLIC_SERVER_URL=$NEXT_PUBLIC_SERVER_URL
ENV NEXT_PUBLIC_SITE_ENV=$NEXT_PUBLIC_SITE_ENV
ENV NEXT_PUBLIC_MEDIA_HOST=$NEXT_PUBLIC_MEDIA_HOST
# 生产站点域名必须是绝对 http(s) 且非本地回环,否则把 localhost canonical/OG 烤进产物。
RUN sh -euc '\
  case "$NEXT_PUBLIC_SERVER_URL" in \
    https://*|http://*) ;; \
    *) echo "NEXT_PUBLIC_SERVER_URL 须为绝对 http(s) 域名(生产备案域名)"; exit 1 ;; \
  esac; \
  if echo "$NEXT_PUBLIC_SERVER_URL" | grep -qiE "localhost|127\.0\.0\.1|0\.0\.0\.0|::1"; then \
    echo "NEXT_PUBLIC_SERVER_URL 不能指向 localhost/回环"; exit 1; \
  fi'
RUN pnpm run build

# runner:全依赖 + 构建产物 + 源码(migrate/worker 需 payload.config + 集合源码)
FROM base AS runner
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder --chown=nextjs:nodejs /app ./
USER nextjs
EXPOSE 3000
ENV PORT=3000
# 默认起前台应用;migrate(release job)与 worker 由 docker-compose 覆盖 command。
CMD ["pnpm", "start"]
