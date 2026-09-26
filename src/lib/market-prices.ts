export type DollarInterval = 'manual' | 'hour' | 'day';

export type MarketPriceQuote = {
  value: number | null;
  unit: string;
  updatedAt: string | null;
};

export type FabricPrice = {
  id: string;
  label: string;
  value: number;
  unit: string;
  updatedAt: string | null;
};

export type PublicMarketPrices = {
  dollar: MarketPriceQuote;
  fabrics: FabricPrice[];
};

export type AdminMarketPrices = PublicMarketPrices & {
  dollar: MarketPriceQuote & {
    url: string;
    path: string;
    interval: DollarInterval;
    error: string;
  };
};

export const DOLLAR_INTERVALS: { id: DollarInterval; label: string }[] = [
  { id: 'manual', label: 'هر وقت خودتان بخواهید' },
  { id: 'hour', label: 'هر ساعت' },
  { id: 'day', label: 'هر روز' },
];

const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';

export function isDollarInterval(value: unknown): value is DollarInterval {
  return value === 'manual' || value === 'hour' || value === 'day';
}

export function dollarIntervalMs(interval: DollarInterval) {
  if (interval === 'hour') return 60 * 60 * 1000;
  if (interval === 'day') return 24 * 60 * 60 * 1000;
  return 0;
}

/** Turn a JSON path such as `data.usd` or `items[0].price` into keys. */
export function jsonPathKeys(path: string) {
  return String(path || '')
    .trim()
    .replace(/\[(\d+)\]/g, '.$1')
    .split('.')
    .map((part) => part.trim())
    .filter(Boolean);
}

export function readJsonPath(value: unknown, path: string): unknown {
  const keys = jsonPathKeys(path);
  let current = value;
  for (const key of keys) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

export function parsePriceNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  let raw = value.trim();
  if (!raw) return null;
  raw = raw.replace(/[۰-۹]/g, (digit) => String(PERSIAN_DIGITS.indexOf(digit)));
  raw = raw.replace(/[٠-٩]/g, (digit) => String(ARABIC_DIGITS.indexOf(digit)));
  raw = raw.replace(/,/g, '').replace(/٬/g, '').replace(/،/g, '');
  const match = raw.match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const n = Number(match[0]);
  return Number.isFinite(n) ? n : null;
}

export function pricePathError(path: string) {
  const text = String(path || '').trim();
  if (!text) return '';
  if (text.length > 200) return 'مسیر مقدار خیلی طولانی است';
  if (!/^[\w.[\]\u0600-\u06FF-]+$/.test(text)) return 'مسیر فقط می‌تواند حرف، عدد، نقطه و کروشه باشد';
  return '';
}
