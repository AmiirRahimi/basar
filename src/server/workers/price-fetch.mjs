import { parentPort } from 'worker_threads';

const MAX_BODY = 1_000_000;

function blockedHost(hostname) {
  const host = String(hostname || '')
    .toLowerCase()
    .replace(/^\[|\]$/g, '')
    .replace(/\.$/, '');
  if (!host || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) {
    return true;
  }
  if (host === '0.0.0.0' || host === '::1') return true;
  const v4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!v4) return false;
  const parts = v4.slice(1).map(Number);
  if (parts.some((part) => part > 255)) return true;
  const [a, b] = parts;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  return false;
}

function readPath(value, path) {
  const keys = String(path || '')
    .trim()
    .replace(/\[(\d+)\]/g, '.$1')
    .split('.')
    .map((part) => part.trim())
    .filter(Boolean);
  let current = value;
  for (const key of keys) {
    if (current == null || typeof current !== 'object') return undefined;
    current = current[key];
  }
  return current;
}

function parseNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  const match = value.replace(/,/g, '').replace(/٬/g, '').match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const n = Number(match[0]);
  return Number.isFinite(n) ? n : null;
}

async function fetchPrice(url, path) {
  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch {
    return { error: 'آدرس API درست نیست' };
  }
  if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') return { error: 'آدرس باید با http یا https شروع شود' };
  if (blockedHost(parsedUrl.hostname)) return { error: 'این آدرس مجاز نیست' };
  let response;
  try {
    response = await fetch(parsedUrl.toString(), {
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
  let parsed = body;
  try {
    parsed = JSON.parse(body);
  } catch {
    parsed = body;
  }
  const picked = String(path || '').trim() ? readPath(parsed, path) : parsed;
  if (String(path || '').trim() && (picked === undefined || picked === null)) return { error: 'در این مسیر مقداری پیدا نشد' };
  const value = parseNumber(picked);
  if (value == null) return { error: 'مقدار پیدا شده عدد نیست' };
  if (value < 0) return { error: 'قیمت نمی‌تواند منفی باشد' };
  return { value };
}

parentPort?.on('message', (message) => {
  const id = String(message?.id || '');
  void fetchPrice(String(message?.url || ''), String(message?.path || '')).then((result) => {
    parentPort?.postMessage({ id, ...result });
  });
});
