export const ACCESS_COOKIE = 'basar_access';
export const REFRESH_COOKIE = 'basar_refresh';
export const CART_COOKIE = 'basar_wholesale_cart';
/** Refresh cookie lifetime. Access tokens are much shorter. */
export const SESSION_DAYS = 7;
export const ACCESS_TOKEN_MINUTES = 15;
export const SESSION_EXPIRED_PARAM = 'expired';

export const PERSON_ROLES: Record<string, string> = {
  '1': 'مشتری عمده',
  '2': 'خیاط',
  '3': 'بنکدار پارچه',
  '4': 'فروشنده',
  '5': 'شست‌وشو',
  '6': 'خرجکار فروش',
  '7': 'چاپ',
};

const PERSON_ROLE_IDS = new Set(Object.keys(PERSON_ROLES));

/** People the store owes money to, opposite of wholesale customers. */
export const PAYABLE_PERSON_ROLES = ['2', '3', '4', '5', '6', '7'] as const;

/** Normalize stored/form person roles (single string, CSV, or array) to unique known ids. */
export function normalizePersonRoles(value: unknown): string[] {
  let raw: unknown[] = [];
  if (Array.isArray(value)) {
    raw = value;
  } else if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        raw = Array.isArray(parsed) ? parsed : [trimmed];
      } catch {
        raw = trimmed.split(/[,\s]+/);
      }
    } else {
      raw = trimmed.split(/[,\s]+/);
    }
  } else if (value != null && value !== '') {
    raw = [value];
  }

  const seen = new Set<string>();
  const next: string[] = [];
  for (const item of raw) {
    const key = String(item ?? '').trim();
    if (!PERSON_ROLE_IDS.has(key) || seen.has(key)) continue;
    seen.add(key);
    next.push(key);
  }
  return next;
}

export function personHasRole(value: unknown, role: string | number) {
  return normalizePersonRoles(value).includes(String(role));
}

export function personRolesLabel(value: unknown) {
  return normalizePersonRoles(value)
    .map((role) => PERSON_ROLES[role])
    .filter(Boolean)
    .join(' · ');
}

export function isPayablePersonRole(role?: string | number | null) {
  return PAYABLE_PERSON_ROLES.includes(String(role || '') as (typeof PAYABLE_PERSON_ROLES)[number]);
}

export function personIsPayable(value: unknown) {
  return normalizePersonRoles(value).some((role) => isPayablePersonRole(role));
}

export function personIsCustomer(value: unknown) {
  return personHasRole(value, '1');
}

export function personRoleLabel(role?: string | number | null | unknown) {
  const roles = normalizePersonRoles(role);
  if (roles.length) return personRolesLabel(roles);
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
