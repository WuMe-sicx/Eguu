import type { CollectionConfig } from 'payload'

import { isAdmin, isAdminOrSelf, isLoggedIn, isAdminFieldLevel } from '../access'

const rolesChanged = (a?: string[], b?: string[]): boolean => {
  const norm = (r?: string[]) => [...(r ?? [])].sort().join(',')
  return norm(a) !== norm(b)
}

export const Admins: CollectionConfig = {
  slug: 'admins',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'email', 'roles'],
  },
  auth: true, // useSessions 默认开启 → 降权时清 sessions 可即时失权
  access: {
    create: isAdmin,
    read: isLoggedIn,
    update: isAdminOrSelf,
    delete: isAdmin,
    admin: ({ req: { user } }) => Boolean(user), // 谁能进后台(boolean-only)
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    {
      name: 'roles',
      type: 'select',
      hasMany: true,
      required: true,
      defaultValue: ['editor'],
      saveToJWT: true, // 进 token,access 判断不必回查库
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'Editor', value: 'editor' },
      ],
      // 仅 admin 可改 roles:editor 自助更新姓名/邮箱/密码时无法把自己提权
      access: { update: isAdminFieldLevel },
    },
  ],
  hooks: {
    beforeChange: [
      ({ data, originalDoc, operation }) => {
        // 降权即失权:角色变更 → 同一写操作内清空该账号全部 session,强制重新登录。
        // 不依赖 JWT 自然过期,旧 cookie 立即失效。
        if (operation === 'update' && originalDoc && rolesChanged(originalDoc.roles, data.roles)) {
          data.sessions = []
        }
        return data
      },
    ],
  },
}
