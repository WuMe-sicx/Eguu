import type { CollectionAfterChangeHook, CollectionConfig } from 'payload'

import { isAdmin, isEditor } from '../access'

type Channel = 'email' | 'sms'

// §10 原子入队:新建咨询后,为每个已配置的通道建一条 pending Notifications 行 + 入一个 notify job,
// 全部传入同一 req → 与 inquiry 落同一 Postgres 事务(任一失败则整体回滚,不会漏 inquiry 却漏通知)。
// 实际发送在 worker(jobs)里做;发送失败只标 Notifications 失败并重试,绝不回滚 inquiry(线索优先)。
const enqueueNotifications: CollectionAfterChangeHook = async ({ doc, operation, req }) => {
  if (operation !== 'create') return doc

  const channels: Channel[] = []
  if (process.env.NOTIFY_EMAIL) channels.push('email')
  if (process.env.NOTIFY_PHONE) channels.push('sms')
  if (channels.length === 0) {
    req.payload.logger.warn('未配置 NOTIFY_EMAIL / NOTIFY_PHONE,跳过咨询通知')
    return doc
  }

  for (const channel of channels) {
    await req.payload.create({
      collection: 'notifications',
      data: { inquiry: doc.id, channel, status: 'pending' },
      overrideAccess: true,
      req,
    })
    await req.payload.jobs.queue({
      task: 'notify',
      input: { inquiryId: doc.id, channel },
      req,
    })
  }
  return doc
}

// 项目咨询提交:不双语、不草稿。createdAt/updatedAt 由 Payload 默认时间戳提供。
export const Inquiries: CollectionConfig = {
  slug: 'inquiries',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'email', 'createdAt'],
  },
  access: {
    // 🔒 create 仅 admin → 匿名 REST 与 GraphQL 均被拒,无法绕过防刷触发短信。
    // 前台经 Server Action 校验后用 Local API(overrideAccess:true)受控内部写入(阶段 5)。
    create: isAdmin,
    read: isEditor,
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    { name: 'name', type: 'text', required: true, maxLength: 200 },
    { name: 'email', type: 'email', required: true }, // email 类型无 maxLength;长度上限在 Server Action 校验
    { name: 'phone', type: 'text', maxLength: 40 },
    { name: 'company', type: 'text', maxLength: 200 },
    { name: 'serviceInterest', type: 'relationship', relationTo: 'services' },
    { name: 'message', type: 'textarea', maxLength: 5000 },
    {
      name: 'consent',
      type: 'checkbox',
      required: true,
      // 必须勾选同意隐私政策(PIPL),未勾不可提交
      validate: (v: unknown) => v === true || '必须同意隐私政策后才能提交',
    },
    { name: 'localeFrom', type: 'text', admin: { readOnly: true } },
  ],
  hooks: {
    afterChange: [enqueueNotifications],
  },
}
