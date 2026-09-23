import { db, dbEngine } from './db';

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

const MAX_KEYS = 5000;

function prune(now: number) {
  if (buckets.size < MAX_KEYS) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt < now) buckets.delete(key);
  }
  if (buckets.size >= MAX_KEYS) {
    const first = buckets.keys().next().value;
    if (first) buckets.delete(first);
  }
}

function memoryRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  prune(now);
  const current = buckets.get(key);
  if (!current || current.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (current.count >= limit) return false;
  current.count += 1;
  return true;
}

function bucketCount(row: unknown) {
  if (!row || typeof row !== 'object') return null;
  const record = row as { count?: unknown; value?: { count?: unknown } };
  if (typeof record.count === 'number') return record.count;
  if (typeof record.value?.count === 'number') return record.value.count;
  return null;
}

async function mongoRateLimit(key: string, limit: number, windowMs: number) {
  const mongoose = (await import('mongoose')).default;
  const col = mongoose.connection.collection('ratelimits');
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowMs);
  const id = key;
  const active = bucketCount(
    await col.findOneAndUpdate({ _id: id, resetAt: { $gt: now } }, { $inc: { count: 1 } }, { returnDocument: 'after' }),
  );
  if (active != null) return active <= limit;
  const reset = await col.findOneAndUpdate(
    { _id: id, resetAt: { $lte: now } },
    { $set: { count: 1, resetAt } },
    { returnDocument: 'after' },
  );
  if (reset) return true;
  try {
    await col.insertOne({ _id: id, count: 1, resetAt });
    return true;
  } catch {
    const again = bucketCount(
      await col.findOneAndUpdate({ _id: id, resetAt: { $gt: new Date() } }, { $inc: { count: 1 } }, { returnDocument: 'after' }),
    );
    return again == null || again <= limit;
  }
}

/** Returns false when the caller should be rejected. Shared across instances when Mongo is connected. */
export async function rateLimit(key: string, limit: number, windowMs: number) {
  try {
    await db();
    if (dbEngine() === 'mongo') return await mongoRateLimit(key, limit, windowMs);
  } catch {
    /* fall back to this process */
  }
  return memoryRateLimit(key, limit, windowMs);
}

export async function clientIp() {
  try {
    const { headers } = await import('next/headers');
    const h = await headers();
    const vercel = (h.get('x-vercel-forwarded-for') || '').split(',')[0]?.trim();
    if (vercel) return vercel;
    const real = (h.get('x-real-ip') || '').trim();
    if (real) return real;
    const forwarded = (h.get('x-forwarded-for') || '')
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);
    return forwarded[forwarded.length - 1] || 'unknown';
  } catch {
    return 'unknown';
  }
}
