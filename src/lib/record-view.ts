export const RECORD_SLUGS: Record<string, string> = {
  people: 'person',
  clothes: 'cloth',
  invoices: 'invoice',
  checks: 'check',
  fabric: 'fabric',
  returned: 'returned',
};

export const RECORD_LIST_HREF: Record<string, string> = {
  person: '/counting/people',
  cloth: '/counting/clothes',
  invoice: '/counting/invoices',
  check: '/counting/checks',
  fabric: '/counting/fabric',
  returned: '/counting/returned',
  color: '/counting/admin/dropdowns',
  size: '/counting/admin/dropdowns',
  'cloth-kind': '/counting/admin/dropdowns',
  'cloth-style': '/counting/admin/dropdowns',
  'admin-user': '/counting/admin/users',
  'admin-purchase': '/counting/admin/users',
  'admin-code': '/counting/admin/users',
};

export const RECORD_TYPE_LABEL: Record<string, string> = {
  person: 'شخص',
  cloth: 'لباس',
  invoice: 'فاکتور',
  check: 'چک',
  fabric: 'خرید پارچه',
  returned: 'برگشتی',
  color: 'رنگ',
  size: 'سایز',
  'cloth-kind': 'نوع لباس',
  'cloth-style': 'مدل لباس',
  'admin-user': 'کاربر',
  'admin-purchase': 'خرید اشتراک',
  'admin-code': 'کد تخفیف',
};

export const RECORD_LIST_TITLE: Record<string, string> = {
  person: 'اشخاص',
  cloth: 'البسه',
  invoice: 'فاکتورها',
  check: 'چک‌ها',
  fabric: 'خرید پارچه',
  returned: 'برگشتی',
  color: 'لیست‌های کمکی',
  size: 'لیست‌های کمکی',
  'cloth-kind': 'لیست‌های کمکی',
  'cloth-style': 'لیست‌های کمکی',
  'admin-user': 'کاربران و اشتراک',
  'admin-purchase': 'کاربران و اشتراک',
  'admin-code': 'کاربران و اشتراک',
};

const DROPDOWN_RESOURCES = new Set(['color', 'size', 'cloth-kind', 'cloth-style']);

export function recordViewPath(resource: string, id: string) {
  const key = String(id || '').trim();
  if (!key) return '#';
  if (resource === 'person') return `/counting/people/${key}`;
  if (resource === 'cloth') return `/counting/clothes/${key}`;
  if (resource === 'invoice') return `/counting/invoices/${key}`;
  if (resource === 'check') return `/counting/checks/${key}`;
  if (resource === 'fabric') return `/counting/fabric/${key}`;
  if (resource === 'returned') return `/counting/returned/${key}`;
  if (DROPDOWN_RESOURCES.has(resource)) return `/counting/admin/dropdowns/${resource}/${key}`;
  if (resource === 'admin-user') return `/counting/admin/records/users/${key}`;
  if (resource === 'admin-purchase') return `/counting/admin/records/purchases/${key}`;
  if (resource === 'admin-code') return `/counting/admin/records/codes/${key}`;
  return '#';
}

export function slugToResource(slug: string) {
  return RECORD_SLUGS[slug] || '';
}

export type DetailFieldKind = 'text' | 'name' | 'toman' | 'date' | 'role' | 'bool' | 'phone' | 'packs';

export type DetailField = {
  key: string;
  label: string;
  kind?: DetailFieldKind;
  linkResource?: string;
};

export type DetailSection = {
  title: string;
  fields: DetailField[];
};

export const RECORD_SECTIONS: Record<string, DetailSection[]> = {
  person: [
    {
      title: 'مشخصات',
      fields: [
        { key: 'fullName', label: 'نام' },
        { key: 'phoneNumber', label: 'موبایل', kind: 'phone' },
        { key: 'role', label: 'نقش', kind: 'role' },
        { key: 'city', label: 'شهر' },
        { key: 'address', label: 'آدرس' },
        { key: 'sewingFee', label: 'اجرت دوخت', kind: 'toman' },
      ],
    },
  ],
  cloth: [
    {
      title: 'شناسه لباس',
      fields: [
        { key: 'code', label: 'کد' },
        { key: '_type', label: 'نوع', kind: 'name', linkResource: 'cloth-kind' },
        { key: '_style', label: 'مدل', kind: 'name', linkResource: 'cloth-style' },
        { key: '_size', label: 'سایز', kind: 'name', linkResource: 'size' },
        { key: '_color', label: 'رنگ', kind: 'name', linkResource: 'color' },
        { key: '_storeId', label: 'فروشگاه', kind: 'name' },
      ],
    },
    {
      title: 'موجودی و قیمت',
      fields: [
        { key: 'count', label: 'تعداد' },
        { key: 'packSummary', label: 'بسته‌ها' },
        { key: 'unitPrice', label: 'قیمت واحد', kind: 'toman' },
        { key: 'boughtFee', label: 'قیمت هر عدد', kind: 'toman' },
        { key: 'onSale', label: 'حراج', kind: 'bool' },
        { key: 'discountPercent', label: 'درصد تخفیف' },
        { key: 'saleEndsAt', label: 'پایان حراج', kind: 'date' },
        { key: 'newCollection', label: 'کالکشن جدید', kind: 'bool' },
        { key: 'published', label: 'منتشر در فروشگاه', kind: 'bool' },
      ],
    },
    {
      title: 'تولید یا خرید',
      fields: [
        { key: 'isProduced', label: 'تولید شده', kind: 'bool' },
        { key: 'fromPastStock', label: 'موجودی قبلی', kind: 'bool' },
        { key: '_producedFrom', label: 'پارچه', kind: 'name', linkResource: 'fabric' },
        { key: 'amountUsed', label: 'مصرف پارچه' },
        { key: '_tailor', label: 'خیاط', kind: 'name', linkResource: 'person' },
        { key: 'tailorFee', label: 'اجرت دوخت', kind: 'toman' },
        { key: '_boughtFrom', label: 'فروشنده', kind: 'name', linkResource: 'person' },
        { key: '_wash', label: 'شست‌وشو', kind: 'name', linkResource: 'person' },
        { key: 'washFee', label: 'اجرت شست', kind: 'toman' },
        { key: 'extrasSummary', label: 'خرج‌های اضافه' },
        { key: '_partner', label: 'شریک', kind: 'name' },
      ],
    },
  ],
  invoice: [
    {
      title: 'مشخصات فاکتور',
      fields: [
        { key: 'invoiceNumber', label: 'شماره' },
        { key: '_client', label: 'صاحب فاکتور', kind: 'name', linkResource: 'person' },
        { key: 'receiverAddress', label: 'آدرس' },
        { key: 'timeStamp', label: 'تاریخ', kind: 'date' },
        { key: 'isSent', label: 'ارسال شده', kind: 'bool' },
        { key: 'storeName', label: 'فروشگاه' },
        { key: 'brandName', label: 'برند' },
      ],
    },
  ],
  check: [
    {
      title: 'مشخصات چک',
      fields: [
        { key: 'direction', label: 'نوع' },
        { key: '_owner', label: 'شخص', kind: 'name', linkResource: 'person' },
        { key: 'amount', label: 'مبلغ', kind: 'toman' },
        { key: 'dueDate', label: 'سررسید' },
        { key: 'serialNumber', label: 'سریال' },
        { key: 'sayadiNumber', label: 'صیادی' },
        { key: 'sourceLabel', label: 'منبع' },
        { key: 'statusLabel', label: 'وضعیت' },
        { key: 'isTransferred', label: 'واگذار شده', kind: 'bool' },
        { key: 'isUsedInPayment', label: 'استفاده در پرداخت', kind: 'bool' },
      ],
    },
  ],
  fabric: [
    {
      title: 'خرید پارچه',
      fields: [
        { key: '_mercer', label: 'بنکدار', kind: 'name', linkResource: 'person' },
        { key: '_tailor', label: 'خیاط', kind: 'name', linkResource: 'person' },
        { key: 'amount', label: 'متراژ' },
        { key: 'priceForUnit', label: 'فی هر متر', kind: 'toman' },
        { key: 'priceForShipingForUnit', label: 'حمل هر متر', kind: 'toman' },
        { key: 'discount', label: 'تخفیف', kind: 'toman' },
        { key: 'totalPrice', label: 'مبلغ کل', kind: 'toman' },
        { key: 'timeStamp', label: 'تاریخ', kind: 'date' },
      ],
    },
  ],
  returned: [
    {
      title: 'برگشتی',
      fields: [
        { key: '_returnedPerson', label: 'مشتری', kind: 'name', linkResource: 'person' },
        { key: 'description', label: 'توضیح' },
        { key: 'timeStamp', label: 'تاریخ', kind: 'date' },
      ],
    },
  ],
  color: [{ title: 'رنگ', fields: [{ key: 'name', label: 'نام' }] }],
  size: [
    {
      title: 'سایز',
      fields: [
        { key: 'name', label: 'نام' },
        { key: '_clothKind', label: 'نوع لباس', kind: 'name', linkResource: 'cloth-kind' },
      ],
    },
  ],
  'cloth-kind': [{ title: 'نوع لباس', fields: [{ key: 'name', label: 'نام' }] }],
  'cloth-style': [
    {
      title: 'مدل لباس',
      fields: [
        { key: 'name', label: 'نام' },
        { key: '_clothKind', label: 'نوع لباس', kind: 'name', linkResource: 'cloth-kind' },
      ],
    },
  ],
  'admin-user': [
    {
      title: 'کاربر',
      fields: [
        { key: 'fullName', label: 'نام' },
        { key: 'phonenumber', label: 'موبایل', kind: 'phone' },
        { key: 'email', label: 'ایمیل' },
        { key: 'city', label: 'شهر' },
        { key: 'address', label: 'آدرس' },
        { key: 'loggedIn', label: 'وارد شده', kind: 'bool' },
        { key: 'planName', label: 'طرح' },
        { key: 'billingCycle', label: 'دوره' },
        { key: 'remainingDays', label: 'مانده اشتراک' },
        { key: 'totalMonths', label: 'جمع ماه' },
        { key: 'purchaseCount', label: 'تعداد خرید' },
        { key: 'endDate', label: 'پایان اشتراک', kind: 'date' },
        { key: 'active', label: 'اشتراک فعال', kind: 'bool' },
      ],
    },
  ],
  'admin-purchase': [
    {
      title: 'خرید اشتراک',
      fields: [
        { key: 'fullName', label: 'کاربر' },
        { key: 'phonenumber', label: 'موبایل', kind: 'phone' },
        { key: 'planName', label: 'طرح' },
        { key: 'billingCycle', label: 'دوره' },
        { key: 'price', label: 'مبلغ', kind: 'toman' },
        { key: 'originalPrice', label: 'مبلغ اصلی', kind: 'toman' },
        { key: 'discountCode', label: 'کد تخفیف' },
        { key: 'startDate', label: 'شروع', kind: 'date' },
        { key: 'endDate', label: 'پایان', kind: 'date' },
        { key: 'active', label: 'فعال', kind: 'bool' },
      ],
    },
  ],
  'admin-code': [
    {
      title: 'کد تخفیف',
      fields: [
        { key: 'code', label: 'کد' },
        { key: 'percent', label: 'درصد' },
        { key: 'usedCount', label: 'استفاده' },
        { key: 'maxUses', label: 'سقف استفاده' },
        { key: 'active', label: 'فعال', kind: 'bool' },
        { key: 'note', label: 'یادداشت' },
        { key: 'expiresAt', label: 'انقضا', kind: 'date' },
      ],
    },
  ],
};

export function relationId(value: unknown) {
  if (value == null || value === '') return '';
  if (typeof value === 'object' && value && '_id' in value) return String((value as { _id?: unknown })._id || '');
  return String(value);
}
