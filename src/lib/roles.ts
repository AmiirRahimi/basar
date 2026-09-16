import type { StoreRole } from './constants';

const ALL: StoreRole[] = ['owner', 'admin', 'seller', 'other'];

export const MENU_ACCESS: Record<string, StoreRole[]> = {
  dashboard: ALL,
  invoice: ['owner', 'admin', 'seller'],
  person: ALL,
  cloth: ALL,
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
  person: ALL,
  fabric: ['owner', 'admin', 'other'],
  check: ['owner', 'admin'],
  returned: ['owner', 'admin', 'seller'],
  payment: ['owner', 'admin', 'seller'],
};

export function canAccessMenu(role: StoreRole, menuId: string, isPlatformAdmin = false) {
  if (menuId === 'admin') return isPlatformAdmin;
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

export function pathMenuId(pathname: string) {
  if (pathname.startsWith('/counting/admin')) return 'admin';
  if (pathname.startsWith('/counting/invoices')) return 'invoice';
  if (pathname.startsWith('/counting/people')) return 'person';
  if (pathname.startsWith('/counting/clothes')) return 'cloth';
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
