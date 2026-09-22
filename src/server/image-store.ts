import { randomBytes } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { s3Configured, s3PublicBase, uploadObject } from './s3';

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

function isInsideUploads(resolved: string) {
  const root = UPLOADS_ROOT.endsWith(path.sep) ? UPLOADS_ROOT : `${UPLOADS_ROOT}${path.sep}`;
  return resolved === UPLOADS_ROOT || resolved.startsWith(root);
}

function allowedRemoteHost(hostname: string) {
  const host = hostname.toLowerCase();
  const bases = [s3PublicBase(), process.env.LIARA_BUCKET_DOMAIN || '', process.env.S3_ENDPOINT || '']
    .map((value) => {
      try {
        return value ? new URL(value.includes('://') ? value : `https://${value}`).hostname.toLowerCase() : '';
      } catch {
        return '';
      }
    })
    .filter(Boolean);
  if (bases.some((base) => host === base || host.endsWith(`.${base}`))) return true;
  if (host.endsWith('.filebase.io') || host === 'ipfs.filebase.io') return true;
  return false;
}

export function isSafeImageUrl(raw: string) {
  if (raw.startsWith('/uploads/')) {
    const resolved = path.resolve(PUBLIC_ROOT, `.${raw}`);
    return isInsideUploads(resolved);
  }
  try {
    const url = new URL(raw);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
    if (allowedRemoteHost(url.hostname)) return true;
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
    if (buf.length > MAX_UPLOAD_BYTES) throw new Error('حجم تصویر زیاد است');
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
  if (s3Configured()) {
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
