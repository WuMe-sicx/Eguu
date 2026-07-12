import type { Access, FieldAccess } from 'payload'

type Role = 'admin' | 'editor'
type MaybeUser = { id?: number | string; roles?: string[] } | null | undefined

const hasRole = (user: MaybeUser, role: Role): boolean => Boolean(user?.roles?.includes(role))

/** 仅 admin */
export const isAdmin: Access = ({ req: { user } }) => hasRole(user, 'admin')

/** 已登录任意角色 */
export const isLoggedIn: Access = ({ req: { user } }) => Boolean(user)

/** admin 或 editor(内容增改) */
export const isEditor: Access = ({ req: { user } }) =>
  hasRole(user, 'admin') || hasRole(user, 'editor')

/** admins 集合:本人或 admin(read/update) */
export const isAdminOrSelf: Access = ({ req: { user } }) => {
  if (!user) return false
  if (hasRole(user, 'admin')) return true
  return { id: { equals: user.id } }
}

/** 公开内容:匿名只见已发布,登录可见草稿 */
export const publishedOrLoggedIn: Access = ({ req: { user } }) => {
  if (user) return true
  return { _status: { equals: 'published' } }
}

/** 字段级:仅 admin 可写(用于 roles.update,防 editor 自助提权) */
export const isAdminFieldLevel: FieldAccess = ({ req: { user } }) => hasRole(user, 'admin')
