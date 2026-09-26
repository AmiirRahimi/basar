const RESERVED = new Set([
  'about',
  'account',
  'admin',
  'api',
  'browse',
  'c',
  'cart',
  'catalog',
  'checkout',
  'contact',
  'accounting',
  'counting',
  'basar',
  'login',
  'pay',
  'product',
  's',
  'shop',
  'store',
]);

export function normalizeShareSlug(value: string) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
}

export function shareSlugError(value: string) {
  const slug = normalizeShareSlug(value);
  if (slug.length < 3) return 'نام انگلیسی باید حداقل ۳ حرف باشد (a-z و عدد).';
  if (!/^[a-z][a-z0-9-]*$/.test(slug)) return 'نام باید با حرف انگلیسی شروع شود و فقط حرف، عدد و خط تیره باشد.';
  if (RESERVED.has(slug)) return 'این نام رزرو شده است. نام دیگری انتخاب کنید.';
  return '';
}

export function sharePath(slug: string) {
  return `/s/${normalizeShareSlug(slug) || slug}`;
}
