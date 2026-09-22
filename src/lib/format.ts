export function displayName(value: unknown): string {
  if (value == null) return '—';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if (obj.fullName || obj.name || obj.code) {
      return String(obj.fullName || obj.name || obj.code);
    }
    if (obj._mercer) return displayName(obj._mercer);
    return String(obj._id || '—');
  }
  return '—';
}

export function faNumber(value?: number | string | null) {
  return new Intl.NumberFormat('fa-IR').format(Number(value || 0));
}

const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';

/** Parse a typed money/amount string (commas, Persian digits) into a finite number. */
export function parseGroupedNumber(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  let raw = String(value ?? '').trim();
  if (!raw) return 0;
  raw = raw.replace(/[۰-۹]/g, (digit) => String(PERSIAN_DIGITS.indexOf(digit)));
  raw = raw.replace(/[٠-٩]/g, (digit) => String(ARABIC_DIGITS.indexOf(digit)));
  raw = raw.replace(/[^\d.-]/g, '');
  if (!raw || raw === '-' || raw === '.' || raw === '-.') return 0;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

/** Format a number with thousand separators, e.g. 30000 → "30,000". */
export function formatGroupedNumber(value?: number | string | null): string {
  if (value == null || value === '') return '';
  const n = typeof value === 'number' ? value : parseGroupedNumber(value);
  if (!Number.isFinite(n)) return '';
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.trunc(n));
}

export function compactToman(value?: number | string | null) {
  const n = Number(value || 0);
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `${faNumber(Math.round(n / 1_000_000_000))} میلیارد`;
  if (abs >= 1_000_000) return `${faNumber(Math.round(n / 1_000_000))} میلیون`;
  if (abs >= 1_000) return `${faNumber(Math.round(n / 1_000))} هزار`;
  return faNumber(n);
}

export function toman(value?: number | string | null) {
  return `${faNumber(value)} تومان`;
}

export function faDate(value?: string | Date | number) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return new Intl.DateTimeFormat('fa-IR').format(d);
}

export function faRelativeTime(value?: string | Date | number) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const diffSec = Math.round((Date.now() - d.getTime()) / 1000);
  if (diffSec < 45) return 'همین الان';
  if (diffSec < 3600) return `${Math.max(1, Math.floor(diffSec / 60))} دقیقه پیش`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} ساعت پیش`;
  if (diffSec < 86400 * 7) return `${Math.floor(diffSec / 86400)} روز پیش`;
  return new Intl.DateTimeFormat('fa-IR', { month: 'short', day: 'numeric' }).format(d);
}

export function faTime(value?: string | Date | number) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('fa-IR', { hour: '2-digit', minute: '2-digit' }).format(d);
}
