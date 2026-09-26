export const ADMIN_PERMISSIONS = [
  { id: 'dashboard', label: 'داشبورد', href: '/admin' },
  { id: 'users', label: 'کاربران و اشتراک', href: '/admin/users' },
  { id: 'usage', label: 'اشتراک و توکن', href: '/admin/usage' },
  { id: 'plans', label: 'طرح‌های اشتراک', href: '/admin/plans' },
  { id: 'messages', label: 'پیام‌ها', href: '/admin/messages' },
  { id: 'sms', label: 'پیامک', href: '/admin/sms' },
  { id: 'telegram', label: 'تلگرام', href: '/admin/telegram' },
  { id: 'orders', label: 'سفارش‌های وب‌سایت', href: '/admin/orders' },
  { id: 'storefront', label: 'سفارش‌های ویترین', href: '/admin/storefront' },
  { id: 'website', label: 'انتشار در وب‌سایت', href: '/admin/website' },
  { id: 'dropdowns', label: 'لیست‌های کمکی', href: '/admin/dropdowns' },
] as const;

export type AdminPermissionId = (typeof ADMIN_PERMISSIONS)[number]['id'];

const ADMIN_PERMISSION_IDS = new Set<string>(ADMIN_PERMISSIONS.map((item) => item.id));

export function isAdminPermissionId(value: string): value is AdminPermissionId {
  return ADMIN_PERMISSION_IDS.has(value);
}

export function normalizeAdminPermissions(value: unknown): AdminPermissionId[] {
  const list = Array.isArray(value) ? value : [];
  const out: AdminPermissionId[] = [];
  for (const item of list) {
    const id = String(item || '').trim();
    if (!isAdminPermissionId(id) || out.includes(id)) continue;
    out.push(id);
  }
  return out;
}

export function resolveAdminPermissions(superuser: boolean, stored: unknown): AdminPermissionId[] {
  if (superuser) return ADMIN_PERMISSIONS.map((item) => item.id);
  return normalizeAdminPermissions(stored);
}

export function adminPermissionForPath(pathname: string): AdminPermissionId | '' {
  const path = pathname.split('?')[0].split('#')[0].replace(/\/+$/, '') || '/';
  if (path === '/admin') return 'dashboard';
  if (path.startsWith('/admin/users') || path.startsWith('/admin/records') || path.startsWith('/admin/change')) {
    return 'users';
  }
  if (path.startsWith('/admin/usage')) return 'usage';
  if (path.startsWith('/admin/plans')) return 'plans';
  if (path.startsWith('/admin/messages')) return 'messages';
  if (path.startsWith('/admin/sms')) return 'sms';
  if (path.startsWith('/admin/telegram')) return 'telegram';
  if (path.startsWith('/admin/orders')) return 'orders';
  if (path.startsWith('/admin/storefront')) return 'storefront';
  if (path.startsWith('/admin/website')) return 'website';
  if (path.startsWith('/admin/dropdowns')) return 'dropdowns';
  if (path.startsWith('/admin')) return '';
  return '';
}

export function hasAdminPermission(permissions: readonly string[] | undefined, permission: AdminPermissionId) {
  return Boolean(permissions?.includes(permission));
}

/** Superuser-only pages. These are not sections that can be granted. */
export function isSuperuserAccessPath(pathname: string) {
  const path = pathname.split('?')[0].split('#')[0].replace(/\/+$/, '') || '/';
  return (
    path === '/admin/access' ||
    path.startsWith('/admin/access/') ||
    path === '/admin/prices' ||
    path.startsWith('/admin/prices/')
  );
}

export function canOpenAdminPath(
  pathname: string,
  input: { superuser?: boolean; permissions?: readonly string[] },
) {
  if (isSuperuserAccessPath(pathname)) return Boolean(input.superuser);
  const need = adminPermissionForPath(pathname);
  return Boolean(need && hasAdminPermission(input.permissions, need));
}

export function firstAdminHref(permissions: readonly string[] | undefined) {
  return ADMIN_PERMISSIONS.find((item) => permissions?.includes(item.id))?.href || '';
}
