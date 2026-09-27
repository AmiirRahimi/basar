import { colorSwatch } from '@/lib/brand';

/** Common wholesale clothing colors. Admin picks one of these, or a custom hex. */
export const COLOR_PALETTE = [
  { name: 'مشکی', hex: '#111111' },
  { name: 'زغالی', hex: '#3a3a3a' },
  { name: 'سرمه‌ای', hex: '#1b365d' },
  { name: 'سورمه', hex: '#243e73' },
  { name: 'آبی', hex: '#2f5f8a' },
  { name: 'آبی روشن', hex: '#7eb6d9' },
  { name: 'جین', hex: '#3d5a80' },
  { name: 'سبز یشمی', hex: '#1f6f5b' },
  { name: 'زیتونی', hex: '#6b7040' },
  { name: 'قرمز', hex: '#9a2e34' },
  { name: 'زرشکی', hex: '#6e2430' },
  { name: 'صورتی', hex: '#e7b7c4' },
  { name: 'کرم', hex: '#e6d3b3' },
  { name: 'بژ', hex: '#c4a574' },
  { name: 'قهوه‌ای', hex: '#6b4423' },
  { name: 'سفید', hex: '#f4f1ea' },
  { name: 'طوسی', hex: '#8d8d8d' },
  { name: 'نخودی', hex: '#d8c38a' },
] as const;

export function normalizeHex(value: unknown) {
  const raw = String(value || '').trim();
  const withHash = raw.startsWith('#') ? raw : `#${raw}`;
  return /^#[0-9a-fA-F]{6}$/.test(withHash) ? withHash.toLowerCase() : '';
}

export function swatchFor(name?: string, hex?: string) {
  return normalizeHex(hex) || colorSwatch(name);
}

export function readableOn(hex: string) {
  const value = normalizeHex(hex).slice(1);
  if (value.length !== 6) return '#111111';
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  const luminance = (r * 299 + g * 587 + b * 114) / 1000;
  return luminance > 160 ? '#1c1917' : '#fafaf9';
}
