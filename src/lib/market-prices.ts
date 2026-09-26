/** Shortest allowed gap between API reads. One shared fetch serves every user. */
export const MIN_PRICE_INTERVAL_SECONDS = 30;
export const MAX_PRICE_INTERVAL_SECONDS = 7 * 24 * 60 * 60;

export type CurrencyPrice = {
  id: string;
  label: string;
  url: string;
  path: string;
  unit: string;
  intervalSeconds: number;
  value: number | null;
  updatedAt: string | null;
  error: string;
};

export type StaticPrice = {
  id: string;
  label: string;
  value: number;
  unit: string;
  updatedAt: string | null;
};

export type TickerPrice = {
  id: string;
  label: string;
  value: number;
  unit: string;
};

export type PublicMarketPrices = {
  currencies: Array<Pick<CurrencyPrice, 'id' | 'label' | 'unit' | 'value' | 'updatedAt'>>;
  statics: StaticPrice[];
};

export type AdminMarketPrices = {
  currencies: CurrencyPrice[];
  statics: StaticPrice[];
};

export function clampPriceInterval(value: unknown) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return 3600;
  return Math.min(MAX_PRICE_INTERVAL_SECONDS, Math.max(MIN_PRICE_INTERVAL_SECONDS, n));
}

export function tickerItems(prices: PublicMarketPrices): TickerPrice[] {
  const items: TickerPrice[] = [];
  for (const row of prices.currencies) {
    if (row.value == null || !row.label) continue;
    items.push({ id: row.id, label: row.label, value: row.value, unit: row.unit });
  }
  for (const row of prices.statics) {
    if (!row.label) continue;
    items.push({ id: row.id, label: row.label, value: row.value, unit: row.unit });
  }
  return items;
}

const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';

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
