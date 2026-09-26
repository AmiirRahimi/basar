import { randomUUID } from 'crypto';
import {
  clampPriceInterval,
  parsePriceNumber,
  pricePathError,
  type AdminMarketPrices,
  type CurrencyPrice,
  type PublicMarketPrices,
  type StaticPrice,
} from '@/lib/market-prices';
import { db, dbEngine, serialize } from './db';
import { fileModels } from './file-db';
import * as mongo from './models';
import { fail, ok, type ActionResult } from './result';
import { requireSession } from './session';

const KEY = 'market';

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

function priceId(value: unknown) {
  const id = String(value || '').trim();
  return /^[a-zA-Z0-9_-]{8,80}$/.test(id) ? id : randomUUID();
}

function emptyAdmin(): AdminMarketPrices {
  return { tickerVisible: true, currencies: [], statics: [] };
}

function legacyIntervalSeconds(value: unknown) {
  if (value === 'hour') return 3600;
  if (value === 'day') return 86400;
  return 3600;
}

function currenciesFromRow(row: Record<string, unknown>): CurrencyPrice[] {
  const stored = Array.isArray(row.currencies) ? row.currencies : [];
  const parsed = stored
    .map((item) => {
      const entry = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
      const label = text(entry.label).slice(0, 40);
      if (!label) return null;
      return {
        id: priceId(entry.id),
        label,
        url: text(entry.url).slice(0, 500),
        path: text(entry.path).slice(0, 200),
        unit: text(entry.unit, 'تومان').slice(0, 40),
        intervalSeconds: clampPriceInterval(entry.intervalSeconds),
        value: quoteValue(entry.value),
        updatedAt: iso(entry.updatedAt),
        error: text(entry.error).slice(0, 200),
      } satisfies CurrencyPrice;
    })
    .filter((item): item is CurrencyPrice => Boolean(item));
  if (parsed.length) return parsed;
  const legacyValue = quoteValue(row.dollarValue);
  const legacyUrl = text(row.dollarUrl);
  if (!legacyUrl && legacyValue == null) return [];
  return [
    {
      id: 'legacy-dollar',
      label: 'دلار',
      url: legacyUrl,
      path: text(row.dollarPath),
      unit: text(row.dollarUnit, 'تومان'),
      intervalSeconds: legacyIntervalSeconds(row.dollarInterval),
      value: legacyValue,
      updatedAt: iso(row.dollarFetchedAt),
      error: text(row.dollarError),
    },
  ];
}

function staticsFromRow(row: Record<string, unknown>): StaticPrice[] {
  const stored = Array.isArray(row.statics) && row.statics.length ? row.statics : row.fabrics;
  const list = Array.isArray(stored) ? stored : [];
  const parsed = list
    .map((item) => {
      const entry = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
      const value = quoteValue(entry.value);
      const label = text(entry.label).slice(0, 40);
      if (!label || value == null || value <= 0) return null;
      return {
        id: priceId(entry.id),
        label,
        value,
        unit: text(entry.unit, 'تومان').slice(0, 40),
        updatedAt: iso(entry.updatedAt),
      } satisfies StaticPrice;
    })
    .filter((item): item is StaticPrice => Boolean(item));
  if (parsed.length) return parsed;
  const legacy = quoteValue(row.fabricValue);
  if (legacy == null || legacy <= 0) return [];
  return [
    {
      id: 'legacy-fabric',
      label: text(row.fabricLabel, 'پارچه').slice(0, 40),
      value: legacy,
      unit: text(row.fabricUnit, 'تومان').slice(0, 40),
      updatedAt: iso(row.fabricUpdatedAt),
    },
  ];
}

function toAdmin(row: Record<string, unknown> | null | undefined): AdminMarketPrices {
  if (!row) return emptyAdmin();
  return {
    tickerVisible: row.tickerVisible !== false,
    currencies: currenciesFromRow(row),
    statics: staticsFromRow(row),
  };
}

function toPublic(prices: AdminMarketPrices): PublicMarketPrices {
  return {
    tickerVisible: prices.tickerVisible,
    currencies: prices.currencies.map((item) => ({
      id: item.id,
      label: item.label,
      unit: item.unit,
      value: item.value,
      updatedAt: item.updatedAt,
    })),
    statics: prices.statics,
  };
}

let memory: AdminMarketPrices | null = null;
let persistTimer: ReturnType<typeof setTimeout> | null = null;

export function rememberMarketPrices(data: AdminMarketPrices) {
  memory = data;
}

export function cachedMarketPrices() {
  return memory;
}

async function loadRow() {
  await db();
  return (await M().MarketPrice.findOne({ key: KEY }).lean()) as Record<string, unknown> | null;
}

async function writeRow(data: AdminMarketPrices) {
  await db();
  const payload = {
    key: KEY,
    tickerVisible: data.tickerVisible !== false,
    currencies: data.currencies,
    statics: data.statics,
    fabrics: data.statics,
    dollarUrl: '',
    dollarPath: '',
    dollarValue: null,
    dollarError: '',
    fabricValue: null,
    fabricLabel: '',
    fabricUnit: '',
    timeStamp: new Date(),
  };
  const existing = await M().MarketPrice.findOne({ key: KEY }).lean();
  if (existing?._id) await M().MarketPrice.findByIdAndUpdate(String(existing._id), payload);
  else await M().MarketPrice.create(payload);
}

function schedulePersist() {
  if (persistTimer || !memory) return;
  persistTimer = setTimeout(() => {
    persistTimer = null;
    const snapshot = memory;
    if (!snapshot) return;
    void writeRow(snapshot).catch(() => {
      // The next tick retries. A failed write must not break request handling.
    });
  }, 1000);
}

export async function readAdminMarketPrices(): Promise<AdminMarketPrices> {
  const { startPriceScheduler } = await import('./price-scheduler');
  startPriceScheduler();
  if (memory) return memory;
  const data = toAdmin(await loadRow());
  memory = data;
  return data;
}

export async function readPublicMarketPrices(): Promise<PublicMarketPrices> {
  return toPublic(await readAdminMarketPrices());
}

export function applyCurrencyResult(id: string, result: { value?: number; error?: string }) {
  if (!memory) return;
  const now = new Date().toISOString();
  memory = {
    ...memory,
    currencies: memory.currencies.map((item) =>
      item.id === id
        ? {
            ...item,
            value: result.value != null ? result.value : item.value,
            error: result.error || '',
            updatedAt: now,
          }
        : item,
    ),
  };
  schedulePersist();
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

async function requireSuperuser() {
  const { requirePlatformAdmin } = await import('./admin');
  return requirePlatformAdmin();
}

export async function getPublicMarketPrices(): Promise<PublicMarketPrices> {
  const auth = await requireSession();
  if ('error' in auth) return toPublic(emptyAdmin());
  return readPublicMarketPrices();
}

export async function getAdminMarketPrices(): Promise<ActionResult<AdminMarketPrices>> {
  const access = await requireSuperuser();
  if ('error' in access) return access.error as ActionResult<AdminMarketPrices>;
  return ok(serialize(await readAdminMarketPrices()));
}

function normalizeCurrencies(input: unknown, previous: CurrencyPrice[]): { currencies: CurrencyPrice[] } | { error: string } {
  const list = Array.isArray(input) ? input : [];
  if (list.length > 20) return { error: 'بیشتر از ۲۰ قیمت ارزی نمی‌شود' };
  const previousById = new Map(previous.map((item) => [item.id, item]));
  const names = new Set<string>();
  const currencies: CurrencyPrice[] = [];
  for (const item of list) {
    const entry = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
    const label = text(entry.label).slice(0, 40);
    const url = text(entry.url).slice(0, 500);
    const path = text(entry.path).slice(0, 200);
    const unit = text(entry.unit, 'تومان').slice(0, 40);
    if (!label && !url && !path) continue;
    if (!label) return { error: 'نام قیمت ارزی را بنویسید' };
    if (!url) return { error: `آدرس API «${label}» را بنویسید` };
    const checked = publicPriceUrl(url);
    if (!checked.ok) return { error: checked.error };
    const pathError = pricePathError(path);
    if (pathError) return { error: pathError };
    const nameKey = label.toLocaleLowerCase('fa');
    if (names.has(nameKey)) return { error: `نام «${label}» تکرار شده است` };
    names.add(nameKey);
    const id = priceId(entry.id);
    const prior = previousById.get(id);
    const intervalSeconds = clampPriceInterval(entry.intervalSeconds);
    const sameSource = prior && prior.url === checked.url && prior.path === path;
    currencies.push({
      id,
      label,
      url: checked.url,
      path,
      unit,
      intervalSeconds,
      value: sameSource ? prior.value : null,
      updatedAt: sameSource ? prior.updatedAt : null,
      error: sameSource ? prior.error : '',
    });
  }
  return { currencies };
}

function normalizeStatics(input: unknown, previous: StaticPrice[]): { statics: StaticPrice[] } | { error: string } {
  const list = Array.isArray(input) ? input : [];
  if (list.length > 40) return { error: 'بیشتر از ۴۰ قیمت ثابت نمی‌شود' };
  const previousById = new Map(previous.map((item) => [item.id, item]));
  const names = new Set<string>();
  const statics: StaticPrice[] = [];
  for (const item of list) {
    const entry = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
    const label = text(entry.label).slice(0, 40);
    const unit = text(entry.unit, 'تومان').slice(0, 40);
    const value = parsePriceNumber(entry.value as never);
    if (!label && (value == null || value <= 0)) continue;
    if (!label) return { error: 'نام قیمت ثابت را بنویسید' };
    if (value == null || value <= 0) return { error: `قیمت «${label}» را وارد کنید` };
    const nameKey = label.toLocaleLowerCase('fa');
    if (names.has(nameKey)) return { error: `نام «${label}» تکرار شده است` };
    names.add(nameKey);
    const id = priceId(entry.id);
    const prior = previousById.get(id);
    const unchanged = prior && prior.label === label && prior.unit === unit && prior.value === value;
    statics.push({
      id,
      label,
      unit,
      value,
      updatedAt: unchanged ? prior.updatedAt : new Date().toISOString(),
    });
  }
  return { statics };
}

export async function saveCurrencyPrices(input: {
  currencies?: Array<Record<string, unknown>>;
}): Promise<ActionResult<AdminMarketPrices>> {
  const access = await requireSuperuser();
  if ('error' in access) return access.error as ActionResult<AdminMarketPrices>;
  const current = await readAdminMarketPrices();
  const normalized = normalizeCurrencies(input.currencies, current.currencies);
  if ('error' in normalized) return fail(normalized.error);
  const next = { ...current, currencies: normalized.currencies };
  rememberMarketPrices(next);
  await writeRow(next);
  const { reloadPriceScheduler } = await import('./price-scheduler');
  reloadPriceScheduler();
  return ok(serialize(next), 'قیمت‌های ارزی ذخیره شد');
}

export async function saveStaticPrices(input: {
  statics?: Array<Record<string, unknown>>;
}): Promise<ActionResult<AdminMarketPrices>> {
  const access = await requireSuperuser();
  if ('error' in access) return access.error as ActionResult<AdminMarketPrices>;
  const current = await readAdminMarketPrices();
  const normalized = normalizeStatics(input.statics, current.statics);
  if ('error' in normalized) return fail(normalized.error);
  const next = { ...current, statics: normalized.statics };
  rememberMarketPrices(next);
  await writeRow(next);
  return ok(serialize(next), 'قیمت‌های ثابت ذخیره شد');
}

export async function saveTickerVisible(visible: boolean): Promise<ActionResult<AdminMarketPrices>> {
  const access = await requireSuperuser();
  if ('error' in access) return access.error as ActionResult<AdminMarketPrices>;
  const current = await readAdminMarketPrices();
  const next = { ...current, tickerVisible: visible !== false };
  rememberMarketPrices(next);
  await writeRow(next);
  return ok(serialize(next), next.tickerVisible ? 'نوار قیمت نمایان شد' : 'نوار قیمت مخفی شد');
}

export async function refreshCurrencyNow(input: { id?: string; url?: string; path?: string }): Promise<ActionResult<AdminMarketPrices>> {
  const access = await requireSuperuser();
  if ('error' in access) return access.error as ActionResult<AdminMarketPrices>;
  const url = text(input.url);
  if (!url) return fail('آدرس API را بنویسید');
  const checked = publicPriceUrl(url);
  if (!checked.ok) return fail(checked.error);
  const path = text(input.path);
  const pathError = pricePathError(path);
  if (pathError) return fail(pathError);
  const { fetchCurrencyInWorker } = await import('./price-scheduler');
  const result = await fetchCurrencyInWorker({ id: priceId(input.id), url: checked.url, path });
  if (result.error) return fail(result.error);
  return ok(serialize(await readAdminMarketPrices()), 'قیمت از API خوانده شد');
}
