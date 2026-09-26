import { Worker } from 'worker_threads';
import path from 'path';
import { applyCurrencyResult, readAdminMarketPrices } from './market-prices';

type FetchJob = { id: string; url: string; path: string };
type FetchResult = { id: string; value?: number; error?: string };

const waiters = new Map<string, (result: FetchResult) => void>();
const inFlight = new Set<string>();
let worker: Worker | null = null;
let timer: ReturnType<typeof setInterval> | null = null;

function workerFile() {
  return path.join(process.cwd(), 'src', 'server', 'workers', 'price-fetch.mjs');
}

function ensureWorker() {
  if (worker) return worker;
  const next = new Worker(workerFile());
  next.on('message', (message: FetchResult) => {
    const id = String(message?.id || '');
    inFlight.delete(id);
    if (message && (message.value != null || message.error)) applyCurrencyResult(id, message);
    const waiter = waiters.get(id);
    if (waiter) {
      waiters.delete(id);
      waiter(message);
    }
  });
  next.on('error', () => {
    worker = null;
  });
  next.on('exit', () => {
    worker = null;
    inFlight.clear();
  });
  worker = next;
  return next;
}

export function fetchCurrencyInWorker(job: FetchJob): Promise<FetchResult> {
  return new Promise((resolve) => {
    const timerId = setTimeout(() => {
      waiters.delete(job.id);
      inFlight.delete(job.id);
      resolve({ id: job.id, error: 'خواندن قیمت طول کشید' });
    }, 12_000);
    waiters.set(job.id, (result) => {
      clearTimeout(timerId);
      resolve(result);
    });
    inFlight.add(job.id);
    try {
      ensureWorker().postMessage(job);
    } catch {
      clearTimeout(timerId);
      waiters.delete(job.id);
      inFlight.delete(job.id);
      resolve({ id: job.id, error: 'رشتهٔ پس‌زمینه در دسترس نیست' });
    }
  });
}

async function tick() {
  let prices;
  try {
    prices = await readAdminMarketPrices();
  } catch {
    return;
  }
  const now = Date.now();
  for (const currency of prices.currencies) {
    if (!currency.url || inFlight.has(currency.id)) continue;
    const updated = currency.updatedAt ? new Date(currency.updatedAt).getTime() : 0;
    const wait = Math.max(30, currency.intervalSeconds) * 1000;
    if (updated && now - updated < wait) continue;
    inFlight.add(currency.id);
    try {
      ensureWorker().postMessage({ id: currency.id, url: currency.url, path: currency.path });
    } catch {
      inFlight.delete(currency.id);
    }
  }
}

export function reloadPriceScheduler() {
  void tick();
}

export function startPriceScheduler() {
  const marker = globalThis as { __basarPriceScheduler?: boolean };
  if (marker.__basarPriceScheduler) return;
  marker.__basarPriceScheduler = true;
  timer = setInterval(() => {
    void tick();
  }, 5_000);
  if (typeof timer.unref === 'function') timer.unref();
  void tick();
}
