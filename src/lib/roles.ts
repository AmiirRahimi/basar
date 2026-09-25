import type { StoreRole } from './constants';

const ALL: StoreRole[] = ['owner', 'admin', 'seller', 'other'];

export const MENU_ACCESS: Record<string, StoreRole[]> = {
  dashboard: ALL,
  invoice: ['owner', 'admin', 'seller'],
  person: ALL,
  cloth: ALL,
  share: ['owner', 'admin', 'seller'],
  images: ['owner', 'admin'],
  check: ['owner', 'admin'],
  fabric: ['owner', 'admin', 'other'],
  account: ['owner', 'admin', 'seller'],
  returned: ['owner', 'admin', 'seller'],
  store: ['owner', 'admin'],
  profile: ALL,
  subscription: ['owner'],
  admin: ['owner'],
};

export const RESOURCE_WRITE_ROLES: Record<string, StoreRole[]> = {
  invoice: ['owner', 'admin', 'seller'],
  'customer-cart': ['owner', 'admin', 'seller'],
  cloth: ['owner', 'admin'],
  'product-share': ['owner', 'admin', 'seller'],
  person: ALL,
  fabric: ['owner', 'admin', 'other'],
  check: ['owner', 'admin'],
  returned: ['owner', 'admin', 'seller'],
  payment: ['owner', 'admin', 'seller'],
};

const ADMIN_MENU_IDS = new Set([
  'admin',
  'users',
  'usage',
  'plans',
  'messages',
  'sms',
  'telegram',
  'storefront',
  'website',
  'dropdowns',
]);

export function canAccessMenu(role: StoreRole, menuId: string, isPlatformAdmin = false) {
  if (ADMIN_MENU_IDS.has(menuId)) return isPlatformAdmin;
  if (isPlatformAdmin) return true;
  const allowed = MENU_ACCESS[menuId];
  if (!allowed) return role === 'owner';
  return allowed.includes(role);
}

export function canWriteResource(
  role: StoreRole,
  resource: string,
  isPlatformAdmin = false,
  subscriptionActive = true,
) {
  if (isPlatformAdmin) return true;
  if (!subscriptionActive) return false;
  const allowed = RESOURCE_WRITE_ROLES[resource];
  if (!allowed) return role === 'owner' || role === 'admin';
  return allowed.includes(role);
}

const RESOURCE_READ_MENU: Record<string, string> = {
  invoice: 'invoice',
  'customer-cart': 'invoice',
  person: 'person',
  cloth: 'cloth',
  'product-share': 'share',
  check: 'check',
  fabric: 'fabric',
  returned: 'returned',
  payment: 'account',
  change: 'admin',
  permision: 'admin',
};

const LOOKUP_RESOURCES = new Set(['color', 'size', 'cloth-kind', 'cloth-style']);

export function canReadResource(role: StoreRole, resource: string, isPlatformAdmin = false) {
  if (isPlatformAdmin) return true;
  if (LOOKUP_RESOURCES.has(resource)) return true;
  const menu = RESOURCE_READ_MENU[resource];
  if (!menu) return role === 'owner' || role === 'admin';
  return canAccessMenu(role, menu, isPlatformAdmin);
}

export function pathMenuId(pathname: string) {
  if (pathname === '/admin' || pathname === '/admin/') return 'dashboard';
  if (pathname.startsWith('/admin/users') || pathname.startsWith('/admin/records')) return 'users';
  if (pathname.startsWith('/admin/usage')) return 'usage';
  if (pathname.startsWith('/admin/plans')) return 'plans';
  if (pathname.startsWith('/admin/messages')) return 'messages';
  if (pathname.startsWith('/admin/sms')) return 'sms';
  if (pathname.startsWith('/admin/telegram')) return 'telegram';
  if (pathname.startsWith('/admin/storefront')) return 'storefront';
  if (pathname.startsWith('/admin/website')) return 'website';
  if (pathname.startsWith('/admin/dropdowns')) return 'dropdowns';
  if (pathname.startsWith('/admin') || pathname.startsWith('/counting/admin')) return 'admin';
  if (pathname.startsWith('/counting/invoices')) return 'invoice';
  if (pathname.startsWith('/counting/people')) return 'person';
  if (pathname.startsWith('/counting/clothes')) return 'cloth';
  if (pathname.startsWith('/counting/shares')) return 'share';
  if (pathname.startsWith('/counting/images')) return 'images';
  if (pathname.startsWith('/counting/checks')) return 'check';
  if (pathname.startsWith('/counting/fabric')) return 'fabric';
  if (pathname.startsWith('/counting/account')) return 'account';
  if (pathname.startsWith('/counting/returned')) return 'returned';
  if (pathname.startsWith('/counting/store')) return 'profile';
  if (pathname.startsWith('/counting/subscription')) return 'subscription';
  if (pathname.startsWith('/counting/profile')) return 'profile';
  if (pathname.startsWith('/counting/dashboard')) return 'dashboard';
  return '';
}
