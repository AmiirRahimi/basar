export const ACCESS_COOKIE = 'basar_access';
export const REFRESH_COOKIE = 'basar_refresh';
export const CART_COOKIE = 'basar_wholesale_cart';
/** Access and refresh cookies both last this long. */
export const SESSION_DAYS = 7;
export const SESSION_EXPIRED_PARAM = 'expired';

export const PERSON_ROLES: Record<string, string> = {
  '1': 'مشتری عمده',
  '2': 'خیاط',
  '3': 'بنکدار پارچه',
  '4': 'فروشنده',
  '5': 'شست‌وشو',
};

/** People the store owes money to, opposite of wholesale customers. */
export const PAYABLE_PERSON_ROLES = ['2', '3', '4', '5'] as const;

export function isPayablePersonRole(role?: string | number | null) {
  return PAYABLE_PERSON_ROLES.includes(String(role || '') as (typeof PAYABLE_PERSON_ROLES)[number]);
}

export function personRoleLabel(role?: string | number | null) {
  return PERSON_ROLES[String(role || '')] || '';
}

export const STORE_STAFF_ROLES = {
  admin: 'مدیر فروشگاه',
  seller: 'فروشنده',
  other: 'سایر',
} as const;

export type StoreStaffRole = keyof typeof STORE_STAFF_ROLES;
export type StoreRole = 'owner' | StoreStaffRole;

export const BRAND_COLORS = ['#0f766e', '#b45309', '#7c3aed', '#be123c', '#0369a1', '#365314'];

export const PHONE_RE = /^0(9)\d{9}$/;

export const DEFAULT_MOQ = 12;
