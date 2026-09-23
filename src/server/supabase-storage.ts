import { createClient, type SupabaseClient } from '@supabase/supabase-js';

function env(name: string, fallback = '') {
  return String(process.env[name] || fallback).trim();
}

export function supabaseUrl() {
  return env('SUPABASE_URL') || env('NEXT_PUBLIC_SUPABASE_URL');
}

export function supabaseSecretKey() {
  return env('SUPABASE_SECRET_KEY') || env('SUPABASE_SERVICE_ROLE_KEY');
}

export function supabasePublishableKey() {
  return env('SUPABASE_PUBLISHABLE_KEY') || env('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY') || env('NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

export function supabaseStorageBucket() {
  return env('SUPABASE_STORAGE_BUCKET', 'basar') || 'basar';
}

export function supabaseConfigured() {
  return Boolean(supabaseUrl() && supabaseSecretKey());
}

let adminClient: SupabaseClient | null = null;
let bucketReady: Promise<void> | null = null;

export function getSupabaseAdmin() {
  if (!supabaseConfigured()) return null;
  if (adminClient) return adminClient;
  adminClient = createClient(supabaseUrl(), supabaseSecretKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return adminClient;
}

const MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
};

async function ensurePublicBucket(client: SupabaseClient, bucket: string) {
  if (!bucketReady) {
    bucketReady = (async () => {
      const listed = await client.storage.listBuckets();
      if (listed.error) throw new Error(listed.error.message);
      const exists = (listed.data || []).some((row) => row.name === bucket);
      if (!exists) {
        const created = await client.storage.createBucket(bucket, {
          public: true,
          fileSizeLimit: '8MB',
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
        });
        if (created.error && !/already exists|duplicate/i.test(created.error.message)) {
          throw new Error(created.error.message);
        }
      }
    })().catch((error) => {
      bucketReady = null;
      throw error;
    });
  }
  await bucketReady;
}

export function supabasePublicUrl(key: string) {
  const base = supabaseUrl().replace(/\/$/, '');
  const bucket = supabaseStorageBucket();
  return `${base}/storage/v1/object/public/${bucket}/${key.replace(/^\/+/, '')}`;
}

export async function uploadObject(key: string, buffer: Buffer, ext = 'jpg') {
  const client = getSupabaseAdmin();
  if (!client) throw new Error('Supabase تنظیم نشده است');

  const bucket = supabaseStorageBucket();
  const safeExt = String(ext || 'jpg').replace(/[^a-z0-9]/gi, '').toLowerCase() || 'jpg';
  const contentType = MIME[safeExt] || 'application/octet-stream';
  const normalizedKey = key.replace(/^\/+/, '');

  await ensurePublicBucket(client, bucket);

  const uploaded = await client.storage.from(bucket).upload(normalizedKey, buffer, {
    contentType,
    upsert: false,
    cacheControl: '31536000',
  });
  if (uploaded.error) {
    throw new Error(uploaded.error.message || 'آپلود به Supabase ناموفق بود');
  }

  const publicUrl = client.storage.from(bucket).getPublicUrl(normalizedKey).data.publicUrl;
  return publicUrl || supabasePublicUrl(normalizedKey);
}
