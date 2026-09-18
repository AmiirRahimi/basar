export const BRAND = {
  name: 'جین پوش',
  latin: 'Jean Poosh',
  family: 'خانواده رحیمی',
  years: 45,
  tagline: 'خانواده رحیمی · بیش از ۴۵ سال در بازار بزرگ',
  description: 'برند پوشاک خانواده رحیمی با بیش از ۴۵ سال فعالیت در بازار بزرگ تهران',
} as const;

export const BRAND_PHONES = [
  { display: '021-55150012', href: 'tel:+982155150012' },
  { display: '021-55814751', href: 'tel:+982155814751' },
  { display: '09120214126', href: 'tel:+989120214126' },
] as const;

export const BRAND_ADDRESSES = [
  {
    title: 'حجره طبقه دوم',
    floor: 'طبقه دوم، پلاک ۳۰',
    line: 'خیابان ۱۵ خرداد، بازار آهنگران، کوچه کلانتری، طبقه دوم، پلاک ۳۰',
  },
  {
    title: 'حجره طبقه اول',
    floor: 'طبقه اول، پلاک ۱۱',
    line: 'خیابان ۱۵ خرداد، بازار آهنگران، کوچه کلانتری، طبقه اول، پلاک ۱۱',
  },
] as const;

const COLOR_SWATCHES: Array<[string, string]> = [
  ['سرمه', '#1b365d'],
  ['زغال', '#3a3a3a'],
  ['مشک', '#111111'],
  ['سیاه', '#111111'],
  ['سفید', '#f4f1ea'],
  ['کرم', '#e6d3b3'],
  ['خاک', '#c4a574'],
  ['آبی روشن', '#7eb6d9'],
  ['نیلی', '#3d5a80'],
  ['آبی', '#2f5f8a'],
  ['جین', '#2c4a6e'],
  ['سورمه', '#1b365d'],
];

export function colorSwatch(name?: string) {
  if (!name) return '#64748b';
  const found = COLOR_SWATCHES.find(([key]) => name.includes(key));
  return found?.[1] || '#64748b';
}
