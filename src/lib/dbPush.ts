// 生产 schema 保护(§17):Drizzle push 会按 config 直接改本地库 schema。
// fail-safe 白名单 —— 仅明确的 development/test 开启;其余(含缺失、拼错如 'prod'、空串、
// 生产 'production')一律 false。绝不 fail-open:未知环境不 push,避免误在生产直改 schema 丢数据。
export const shouldPush = (nodeEnv: string | undefined): boolean =>
  nodeEnv === 'development' || nodeEnv === 'test'
