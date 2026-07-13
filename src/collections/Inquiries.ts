import type { CollectionConfig } from 'payload'

import { isAdmin, isEditor } from '../access'

// 项目咨询提交:不双语、不草稿。createdAt/updatedAt 由 Payload 默认时间戳提供。
// 通知入队**不再走 afterChange**(那会与 inquiry 落同一事务,入队失败即回滚丢单)。
// 改为 Server Action 在 inquiry 提交后调用 enqueueInquiryNotifications(独立事务,线索优先)。
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
}
