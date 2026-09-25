export const PERMISSION_GROUPS = [
  {
    id: 'dashboard',
    label: 'داشبورد',
    items: [{ id: 'dashboard.view', label: 'مشاهده داشبورد' }],
  },
  {
    id: 'invoice',
    label: 'فاکتور',
    items: [
      { id: 'invoice.view', label: 'مشاهده فاکتورها' },
      { id: 'invoice.write', label: 'ثبت و ویرایش فاکتور' },
    ],
  },
  {
    id: 'person',
    label: 'اشخاص',
    items: [
      { id: 'person.view', label: 'مشاهده اشخاص' },
      { id: 'person.write', label: 'ثبت و ویرایش اشخاص' },
    ],
  },
  {
    id: 'cloth',
    label: 'البسه',
    items: [
      { id: 'cloth.view', label: 'مشاهده البسه' },
      { id: 'cloth.write', label: 'ثبت و ویرایش البسه' },
    ],
  },
  {
    id: 'share',
    label: 'لینک محصول',
    items: [
      { id: 'share.view', label: 'مشاهده لینک‌ها' },
      { id: 'share.write', label: 'ساخت و ویرایش لینک' },
    ],
  },
  {
    id: 'images',
    label: 'تصویر محصول',
    items: [
      { id: 'images.view', label: 'مشاهده استودیو تصویر' },
      { id: 'images.write', label: 'ویرایش و ساخت تصویر' },
    ],
  },
  {
    id: 'check',
    label: 'چک',
    items: [
      { id: 'check.view', label: 'مشاهده چک‌ها' },
      { id: 'check.write', label: 'ثبت و ویرایش چک' },
    ],
  },
  {
    id: 'fabric',
    label: 'خرید پارچه',
    items: [
      { id: 'fabric.view', label: 'مشاهده خرید پارچه' },
      { id: 'fabric.write', label: 'ثبت و ویرایش خرید پارچه' },
    ],
  },
  {
    id: 'account',
    label: 'حساب',
    items: [
      { id: 'account.view', label: 'مشاهده حساب و پرداخت' },
      { id: 'account.write', label: 'ثبت پرداخت' },
    ],
  },
  {
    id: 'returned',
    label: 'برگشتی',
    items: [
      { id: 'returned.view', label: 'مشاهده برگشتی' },
      { id: 'returned.write', label: 'ثبت و ویرایش برگشتی' },
    ],
  },
  {
    id: 'store',
    label: 'فروشگاه و کاتالوگ',
    items: [
      { id: 'store.view', label: 'مشاهده فروشگاه' },
      { id: 'store.write', label: 'ویرایش فروشگاه و کاتالوگ' },
    ],
  },
  {
    id: 'workspace',
    label: 'برند و فروشگاه',
    items: [
      { id: 'workspace.view', label: 'مشاهده برند و فروشگاه' },
      { id: 'workspace.write', label: 'ساخت و ویرایش برند و فروشگاه' },
    ],
  },
  {
    id: 'partners',
    label: 'شرکای درآمد',
    items: [
      { id: 'partners.view', label: 'مشاهده شرکا' },
      { id: 'partners.write', label: 'ثبت و ویرایش شریک' },
    ],
  },
  {
    id: 'profile',
    label: 'حساب کاربری',
    items: [{ id: 'profile.view', label: 'مشاهده تنظیمات حساب' }],
  },
  {
    id: 'subscription',
    label: 'اشتراک',
    items: [{ id: 'subscription.view', label: 'مشاهده اشتراک' }],
  },
] as const;

export type PermissionId = (typeof PERMISSION_GROUPS)[number]['items'][number]['id'];

export const ALL_PERMISSION_IDS = PERMISSION_GROUPS.flatMap((group) => group.items.map((item) => item.id));

const PERMISSION_SET = new Set<string>(ALL_PERMISSION_IDS);

export const OWNER_PERMISSIONS = [...ALL_PERMISSION_IDS];

export const PERMISSION_PRESETS = [
  { id: 'all', label: 'همه دسترسی‌ها', permissions: OWNER_PERMISSIONS },
  {
    id: 'sales',
    label: 'فروش',
    permissions: [
      'dashboard.view',
      'invoice.view',
      'invoice.write',
      'person.view',
      'person.write',
      'cloth.view',
      'share.view',
      'share.write',
      'account.view',
      'account.write',
      'returned.view',
      'returned.write',
      'profile.view',
    ],
  },
  {
    id: 'warehouse',
    label: 'انبار و تولید',
    permissions: [
      'dashboard.view',
      'cloth.view',
      'cloth.write',
      'fabric.view',
      'fabric.write',
      'person.view',
      'person.write',
      'images.view',
      'profile.view',
    ],
  },
  {
    id: 'view',
    label: 'فقط مشاهده',
    permissions: ALL_PERMISSION_IDS.filter((id) => id.endsWith('.view')),
  },
] as const;

const MENU_PERMISSION: Record<string, PermissionId> = {
  dashboard: 'dashboard.view',
  invoice: 'invoice.view',
  person: 'person.view',
  cloth: 'cloth.view',
  share: 'share.view',
  images: 'images.view',
  check: 'check.view',
  fabric: 'fabric.view',
  account: 'account.view',
  returned: 'returned.view',
  store: 'store.view',
  profile: 'profile.view',
  subscription: 'subscription.view',
};

const RESOURCE_VIEW: Record<string, PermissionId> = {
  invoice: 'invoice.view',
  'customer-cart': 'invoice.view',
  person: 'person.view',
  cloth: 'cloth.view',
  'product-share': 'share.view',
  check: 'check.view',
  fabric: 'fabric.view',
  returned: 'returned.view',
  payment: 'account.view',
};

const RESOURCE_WRITE: Record<string, PermissionId> = {
  invoice: 'invoice.write',
  'customer-cart': 'invoice.write',
  person: 'person.write',
  cloth: 'cloth.write',
  'product-share': 'share.write',
  check: 'check.write',
  fabric: 'fabric.write',
  returned: 'returned.write',
  payment: 'account.write',
};

export function isPermissionId(value: string): value is PermissionId {
  return PERMISSION_SET.has(value);
}

export function sanitizePermissions(value: unknown): PermissionId[] {
  const raw = Array.isArray(value) ? value : [];
  const next: PermissionId[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const id = String(item || '').trim();
    if (!isPermissionId(id) || seen.has(id)) continue;
    seen.add(id);
    next.push(id);
  }
  return next;
}

export function hasPermission(permissions: string[] | null | undefined, id: string) {
  if (!permissions) return false;
  return permissions.includes(id);
}

export function menuPermission(menuId: string) {
  return MENU_PERMISSION[menuId];
}

export function resourceViewPermission(resource: string) {
  return RESOURCE_VIEW[resource];
}

export function resourceWritePermission(resource: string) {
  return RESOURCE_WRITE[resource];
}

export function permissionLabel(id: string) {
  for (const group of PERMISSION_GROUPS) {
    const item = group.items.find((row) => row.id === id);
    if (item) return item.label;
  }
  return id;
}
