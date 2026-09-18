import { randomBytes } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'product-edits');
const PUBLIC_ROOT = path.join(process.cwd(), 'public');
const MAX_BYTES = 8 * 1024 * 1024;

function blockedHost(hostname: string) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host === '0.0.0.0' || host === '::1' || host.endsWith('.local') || host.endsWith('.internal')) {
    return true;
  }
  if (/^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return true;
  if (/^169\.254\./.test(host) || host.startsWith('fd') || host.startsWith('fc')) return true;
  return false;
}

export function isSafeImageUrl(raw: string) {
  if (raw.startsWith('/uploads/')) {
    const resolved = path.resolve(PUBLIC_ROOT, `.${raw}`);
    return resolved.startsWith(UPLOAD_DIR);
  }
  try {
    const url = new URL(raw);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
    if (blockedHost(url.hostname)) return false;
    return true;
  } catch {
    return false;
  }
}

export async function readSourceImage(raw: string) {
  if (!isSafeImageUrl(raw)) throw new Error('آدرس تصویر مجاز نیست');
  if (raw.startsWith('/uploads/')) {
    const file = path.resolve(PUBLIC_ROOT, `.${raw}`);
    const buf = await fs.readFile(file);
    if (buf.length > MAX_BYTES) throw new Error('حجم تصویر زیاد است');
    return buf;
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch(raw, {
      signal: controller.signal,
      headers: { Accept: 'image/*', 'User-Agent': 'BasarImageStudio/1.0' },
      redirect: 'follow',
    });
    if (!res.ok) throw new Error('دانلود تصویر ناموفق بود');
    const length = Number(res.headers.get('content-length') || 0);
    if (length > MAX_BYTES) throw new Error('حجم تصویر زیاد است');
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > MAX_BYTES) throw new Error('حجم تصویر زیاد است');
    return buf;
  } finally {
    clearTimeout(timer);
  }
}

export async function saveProductImage(buffer: Buffer, ext = 'jpg') {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  const name = `${Date.now()}-${randomBytes(6).toString('hex')}.${ext}`;
  await fs.writeFile(path.join(UPLOAD_DIR, name), buffer);
  return `/uploads/product-edits/${name}`;
}
