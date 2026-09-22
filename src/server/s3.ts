import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

function env(name: string, fallback = '') {
  return String(process.env[name] || fallback).trim();
}

export function s3AccessKey() {
  return env('S3_ACCESS_KEY') || env('FILEBASE_ACCESS_KEY') || env('LIARA_BUCKET_ACCESS');
}

export function s3SecretKey() {
  return env('S3_SECRET_KEY') || env('FILEBASE_SECRET_KEY') || env('LIARA_BUCKET_SECRET');
}

export function s3Bucket() {
  return env('S3_BUCKET') || env('FILEBASE_BUCKET') || env('LIARA_BUCKET_NAME');
}

export function s3Endpoint() {
  return env('S3_ENDPOINT', 'https://s3.filebase.io').replace(/\/$/, '');
}

export function s3Region() {
  return env('S3_REGION', 'us-east-1') || 'us-east-1';
}

export function s3PublicBase() {
  const explicit =
    env('NEXT_PUBLIC_BUCKET_URL') ||
    env('S3_PUBLIC_URL') ||
    env('LIARA_BUCKET_DOMAIN') ||
    env('FILEBASE_PUBLIC_URL');
  if (explicit) return explicit.replace(/\/$/, '');
  const bucket = s3Bucket();
  const endpoint = s3Endpoint();
  if (!bucket || !endpoint) return '';
  try {
    const url = new URL(endpoint);
    return `${url.protocol}//${bucket}.${url.host}`;
  } catch {
    return `${endpoint}/${bucket}`;
  }
}

export function s3Configured() {
  return Boolean(s3AccessKey() && s3SecretKey() && s3Bucket() && s3Endpoint());
}

let client: S3Client | null = null;

function getClient() {
  if (!s3Configured()) return null;
  if (client) return client;
  const forcePathStyle = env('S3_FORCE_PATH_STYLE', 'true') !== 'false';
  client = new S3Client({
    region: s3Region(),
    endpoint: s3Endpoint(),
    forcePathStyle,
    credentials: {
      accessKeyId: s3AccessKey(),
      secretAccessKey: s3SecretKey(),
    },
  });
  return client;
}

const MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
};

export async function uploadObject(key: string, buffer: Buffer, ext = 'jpg') {
  const s3 = getClient();
  const bucket = s3Bucket();
  if (!s3 || !bucket) throw new Error('ذخیره‌ساز ابری تنظیم نشده است');

  const safeExt = String(ext || 'jpg').replace(/[^a-z0-9]/gi, '').toLowerCase() || 'jpg';
  const contentType = MIME[safeExt] || 'application/octet-stream';
  const normalizedKey = key.replace(/^\/+/, '');

  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: normalizedKey,
        Body: buffer,
        ContentType: contentType,
        ACL: 'public-read',
      }),
    );
  } catch (error) {
    // Some S3 providers (or bucket policies) reject ACL; retry without it.
    const message = error instanceof Error ? error.message : String(error);
    if (!/ACL|AccessControlList|NotImplemented|InvalidRequest/i.test(message)) throw error;
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: normalizedKey,
        Body: buffer,
        ContentType: contentType,
      }),
    );
  }

  const base = s3PublicBase();
  if (!base) throw new Error('آدرس عمومی باکت تنظیم نشده است (NEXT_PUBLIC_BUCKET_URL)');
  return `${base}/${normalizedKey}`;
}
