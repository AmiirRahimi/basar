import { randomBytes } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { supabaseConfigured, supabaseUrl, uploadObject } from './supabase-storage';

const PUBLIC_ROOT = path.join(process.cwd(), 'public');
const UPLOADS_ROOT = path.join(PUBLIC_ROOT, 'uploads');
const PRODUCT_EDITS_DIR = path.join(UPLOADS_ROOT, 'product-edits');
const CLOTHES_DIR = path.join(UPLOADS_ROOT, 'clothes');
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

const ALLOWED_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

function isInsideUploads(resolved: string) {
  const root = UPLOADS_ROOT.endsWith(path.sep) ? UPLOADS_ROOT : `${UPLOADS_ROOT}${path.sep}`;
  return resolved === UPLOADS_ROOT || resolved.startsWith(root);
}

function allowedRemoteHost(hostname: string) {
  const host = hostname.toLowerCase();
  try {
    const supabaseHost = supabaseUrl() ? new URL(supabaseUrl()).hostname.toLowerCase() : '';
    if (supabaseHost && (host === supabaseHost || host.endsWith(`.${supabaseHost}`))) return true;
  } catch {
    /* ignore */
  }
  if (host.endsWith('.supabase.co') || host.endsWith('.supabase.in')) return true;
  return false;
}

export function isSafeImageUrl(raw: string) {
  if (raw.startsWith('/uploads/')) {
    const resolved = path.resolve(PUBLIC_ROOT, `.${raw}`);
    return isInsideUploads(resolved);
  }
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:') return false;
    return allowedRemoteHost(url.hostname);
  } catch {
    return false;
  }
}

export function sniffImageExt(buffer: Buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpg';
  if (buffer.length >= 8 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return 'png';
  if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  if (buffer.length >= 6 && (buffer.toString('ascii', 0, 6) === 'GIF87a' || buffer.toString('ascii', 0, 6) === 'GIF89a')) return 'gif';
  return '';
}

export async function readSourceImage(raw: string) {
  if (!isSafeImageUrl(raw)) throw new Error('آدرس تصویر مجاز نیست');
  if (raw.startsWith('/uploads/')) {
    const file = path.resolve(PUBLIC_ROOT, `.${raw}`);
    const buf = await fs.readFile(file);
    if (buf.length > MAX_UPLOAD_BYTES) throw new Error('حجم تصویر زیاد است');
    return buf;
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch(raw, {
      signal: controller.signal,
      headers: { Accept: 'image/*', 'User-Agent': 'BasarImageStudio/1.0' },
      redirect: 'manual',
    });
    if (res.status >= 300 && res.status < 400) throw new Error('آدرس تصویر مجاز نیست');
    if (!res.ok) throw new Error('دانلود تصویر ناموفق بود');
    const length = Number(res.headers.get('content-length') || 0);
    if (length > MAX_UPLOAD_BYTES) throw new Error('حجم تصویر زیاد است');
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > MAX_UPLOAD_BYTES) throw new Error('حجم تصویر زیاد است');
    return buf;
  } finally {
    clearTimeout(timer);
  }
}

async function saveInDir(dir: string, publicPrefix: string, buffer: Buffer, ext = 'jpg') {
  await fs.mkdir(dir, { recursive: true });
  const safeExt = String(ext || 'jpg').replace(/[^a-z0-9]/gi, '').toLowerCase() || 'jpg';
  const name = `${Date.now()}-${randomBytes(6).toString('hex')}.${safeExt}`;
  await fs.writeFile(path.join(dir, name), buffer);
  return `${publicPrefix}/${name}`;
}

async function saveUpload(folder: 'clothes' | 'product-edits', buffer: Buffer, ext = 'jpg') {
  const safeExt = String(ext || 'jpg').replace(/[^a-z0-9]/gi, '').toLowerCase() || 'jpg';
  const name = `${Date.now()}-${randomBytes(6).toString('hex')}.${safeExt}`;
  if (supabaseConfigured()) {
    return uploadObject(`${folder}/${name}`, buffer, safeExt);
  }
  if (folder === 'clothes') return saveInDir(CLOTHES_DIR, '/uploads/clothes', buffer, safeExt);
  return saveInDir(PRODUCT_EDITS_DIR, '/uploads/product-edits', buffer, safeExt);
}

export async function saveProductImage(buffer: Buffer, ext = 'jpg') {
  return saveUpload('product-edits', buffer, ext);
}

export async function saveClothImage(buffer: Buffer, ext = 'jpg') {
  return saveUpload('clothes', buffer, ext);
}

export function extensionForMime(mime: string) {
  return ALLOWED_MIME[mime.toLowerCase()] || '';
}

export function isAllowedImageMime(mime: string) {
  return Boolean(extensionForMime(mime));
}
