import type { CollectionConfig } from 'payload'

import { isAdmin } from '../access'

// 通知 outbox / 审计(§10):每条 inquiry 每通道一行,唯一 (inquiry,channel) 作幂等键。
// 仅内部写入(afterChange 建行、worker 改状态,均 overrideAccess:true);后台仅 admin 只读,不对外。
export const Notifications: CollectionConfig = {
  slug: 'notifications',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['inquiry', 'channel', 'status', 'updatedAt'],
    group: '系统',
  },
  access: {
    create: () => false, // 外部一律拒;内部经 overrideAccess 写入
    read: isAdmin,
    update: () => false,
    delete: isAdmin,
  },
  indexes: [{ fields: ['inquiry', 'channel'], unique: true }],
  fields: [
    { name: 'inquiry', type: 'relationship', relationTo: 'inquiries', required: true },
    {
      name: 'channel',
      type: 'select',
      required: true,
      options: [
        { label: 'Email', value: 'email' },
        { label: 'SMS', value: 'sms' },
      ],
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Sent', value: 'sent' },
        { label: 'Failed', value: 'failed' },
      ],
    },
    { name: 'providerId', type: 'text', admin: { description: '供应商 request ID,对账用' } },
    { name: 'error', type: 'text' },
    { name: 'attempts', type: 'number', defaultValue: 0 },
  ],
}
