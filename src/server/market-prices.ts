import {
  dollarIntervalMs,
  isDollarInterval,
  parsePriceNumber,
  pricePathError,
  readJsonPath,
  type AdminMarketPrices,
  type DollarInterval,
  type PublicMarketPrices,
} from '@/lib/market-prices';
import { db, dbEngine, serialize } from './db';
import { fileModels } from './file-db';
import * as mongo from './models';
import { fail, ok, type ActionResult } from './result';
import { requireSession } from './session';

const KEY = 'market';
const MAX_BODY = 1_000_000;

function M() {
  return dbEngine() === 'file' ? fileModels : mongo;
}

function text(value: unknown, fallback = '') {
  return String(value ?? '').trim() || fallback;
}

function quoteValue(value: unknown) {
  if (value == null || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function iso(value: unknown) {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function emptyAdmin(): AdminMarketPrices {
  return {
    dollar: {
      value: null,
      unit: 'تومان',
      updatedAt: null,
      url: '',
      path: '',
      interval: 'manual',
      error: '',
    },
    fabric: { value: null, unit: 'تومان', label: 'پارچه', updatedAt: null },
  };
}

function toAdmin(row: Record<string, unknown> | null | undefined): AdminMarketPrices {
  const base = emptyAdmin();
  if (!row) return base;
  const interval = isDollarInterval(row.dollarInterval) ? row.dollarInterval : 'manual';
  return {
    dollar: {
      value: quoteValue(row.dollarValue),
      unit: text(row.dollarUnit, 'تومان'),
      updatedAt: iso(row.dollarFetchedAt),
      url: text(row.dollarUrl),
      path: text(row.dollarPath),
      interval,
      error: text(row.dollarError),
    },
    fabric: {
      value: quoteValue(row.fabricValue),
      unit: text(row.fabricUnit, 'تومان'),
      label: text(row.fabricLabel, 'پارچه'),
      updatedAt: iso(row.fabricUpdatedAt),
    },
  };
}

function toPublic(prices: AdminMarketPrices): PublicMarketPrices {
  return {
    dollar: { value: prices.dollar.value, unit: prices.dollar.unit, updatedAt: prices.dollar.updatedAt },
    fabric: prices.fabric,
  };
}

async function loadRow() {
  await db();
  return (await M().MarketPrice.findOne({ key: KEY }).lean()) as Record<string, unknown> | null;
}

async function saveRow(patch: Record<string, unknown>) {
  await db();
  const existing = await M().MarketPrice.findOne({ key: KEY }).lean();
  const payload = { ...patch, key: KEY, timeStamp: new Date() };
  if (existing?._id) {
    await M().MarketPrice.findByIdAndUpdate(String(existing._id), payload);
  } else {
    await M().MarketPrice.create(payload);
  }
  return toAdmin((await loadRow()) || { ...existing, ...patch });
}

function blockedHost(hostname: string) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '');
  if (!host || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) {
    return true;
  }
  if (host === '0.0.0.0' || host === '::1' || host === 'metadata.google.internal') return true;
  const v4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!v4) return host.includes(':') && (host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80'));
  const parts = v4.slice(1).map(Number);
  if (parts.some((part) => part > 255)) return true;
  const [a, b] = parts;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  return false;
}

export function publicPriceUrl(raw: string): { ok: true; url: string } | { ok: false; error: string } {
  let url: URL;
  try {
    url = new URL(String(raw || '').trim());
  } catch {
    return { ok: false, error: 'آدرس API درست نیست' };
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return { ok: false, error: 'آدرس باید با http یا https شروع شود' };
  if (url.username || url.password) return { ok: false, error: 'آدرس نباید نام کاربری یا رمز داشته باشد' };
  if (blockedHost(url.hostname)) return { ok: false, error: 'این آدرس مجاز نیست' };
  return { ok: true, url: url.toString() };
}

async function readDollarResponse(url: string, path: string) {
  const checked = publicPriceUrl(url);
  if (!checked.ok) return { error: checked.error };
  const pathError = pricePathError(path);
  if (pathError) return { error: pathError };
  let response: Response;
  try {
    response = await fetch(checked.url, {
      redirect: 'error',
      signal: AbortSignal.timeout(8000),
      headers: { accept: 'application/json, text/plain' },
    });
  } catch {
    return { error: 'اتصال به API برقرار نشد' };
  }
  if (!response.ok) return { error: `API پاسخ ${response.status} داد` };
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength > MAX_BODY) return { error: 'پاسخ API خیلی بزرگ است' };
  const body = new TextDecoder().decode(bytes).trim();
  let parsed: unknown = body;
  try {
    parsed = JSON.parse(body);
  } catch {
    parsed = body;
  }
  const picked = path.trim() ? readJsonPath(parsed, path) : parsed;
  if (path.trim() && (picked === undefined || picked === null)) return { error: 'در این مسیر مقداری پیدا نشد' };
  const value = parsePriceNumber(picked as never);
  if (value == null) return { error: 'مقدار پیدا شده عدد نیست' };
  if (value < 0) return { error: 'قیمت نمی‌تواند منفی باشد' };
  return { value };
}

async function requireSuperuser() {
  const { requirePlatformAdmin } = await import('./admin');
  return requirePlatformAdmin();
}

export async function getPublicMarketPrices(): Promise<PublicMarketPrices> {
  const auth = await requireSession();
  if ('error' in auth) return toPublic(emptyAdmin());
  const prices = await refreshDollarIfDue();
  return toPublic(prices);
}

export async function getAdminMarketPrices(): Promise<ActionResult<AdminMarketPrices>> {
  const access = await requireSuperuser();
  if ('error' in access) return access.error as ActionResult<AdminMarketPrices>;
  const prices = await refreshDollarIfDue();
  return ok(serialize(prices));
}

export async function saveDollarPriceSettings(input: {
  url?: string;
  path?: string;
  interval?: string;
  unit?: string;
}): Promise<ActionResult<AdminMarketPrices>> {
  const access = await requireSuperuser();
  if ('error' in access) return access.error as ActionResult<AdminMarketPrices>;
  const url = text(input.url);
  const path = text(input.path);
  const interval: DollarInterval = isDollarInterval(input.interval) ? input.interval : 'manual';
  const unit = text(input.unit, 'تومان').slice(0, 40);
  if (url) {
    const checked = publicPriceUrl(url);
    if (!checked.ok) return fail(checked.error);
  }
  const pathError = pricePathError(path);
  if (pathError) return fail(pathError);
  const prices = await saveRow({
    dollarUrl: url,
    dollarPath: path,
    dollarInterval: interval,
    dollarUnit: unit,
  });
  return ok(serialize(prices), 'تنظیمات قیمت دلار ذخیره شد');
}

export async function refreshDollarPrice(input: {
  url?: string;
  path?: string;
  interval?: string;
  unit?: string;
}): Promise<ActionResult<AdminMarketPrices>> {
  const access = await requireSuperuser();
  if ('error' in access) return access.error as ActionResult<AdminMarketPrices>;
  const url = text(input.url);
  const path = text(input.path);
  const interval: DollarInterval = isDollarInterval(input.interval) ? input.interval : 'manual';
  const unit = text(input.unit, 'تومان').slice(0, 40);
  if (!url) return fail('آدرس API را بنویسید');
  const read = await readDollarResponse(url, path);
  if ('error' in read) {
    await saveRow({ dollarUrl: url, dollarPath: path, dollarInterval: interval, dollarUnit: unit, dollarError: read.error });
    return fail(read.error);
  }
  const prices = await saveRow({
    dollarUrl: url,
    dollarPath: path,
    dollarInterval: interval,
    dollarUnit: unit,
    dollarValue: read.value,
    dollarFetchedAt: new Date(),
    dollarError: '',
  });
  return ok(serialize(prices), 'قیمت دلار به‌روز شد');
}

export async function saveFabricPrice(input: {
  value?: number | string;
  unit?: string;
  label?: string;
}): Promise<ActionResult<AdminMarketPrices>> {
  const access = await requireSuperuser();
  if ('error' in access) return access.error as ActionResult<AdminMarketPrices>;
  const value = parsePriceNumber(input.value as never);
  const unit = text(input.unit, 'تومان').slice(0, 40);
  const label = text(input.label, 'پارچه').slice(0, 40);
  if (value == null || value <= 0) return fail('قیمت پارچه را وارد کنید');
  const prices = await saveRow({
    fabricValue: value,
    fabricUnit: unit,
    fabricLabel: label,
    fabricUpdatedAt: new Date(),
  });
  return ok(serialize(prices), 'قیمت پارچه ذخیره شد');
}

let refreshing: Promise<AdminMarketPrices> | null = null;

async function refreshDollarIfDue(): Promise<AdminMarketPrices> {
  if (refreshing) return refreshing;
  refreshing = refreshDollarIfDueNow().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

async function refreshDollarIfDueNow(): Promise<AdminMarketPrices> {
  const current = toAdmin(await loadRow());
  const wait = dollarIntervalMs(current.dollar.interval);
  if (!wait || !current.dollar.url) return current;
  const updated = current.dollar.updatedAt ? new Date(current.dollar.updatedAt).getTime() : 0;
  if (updated && Date.now() - updated < wait) return current;
  const read = await readDollarResponse(current.dollar.url, current.dollar.path);
  if ('error' in read) {
    return saveRow({ dollarError: read.error });
  }
  return saveRow({
    dollarValue: read.value,
    dollarFetchedAt: new Date(),
    dollarError: '',
  });
}
