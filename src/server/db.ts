import mongoose from 'mongoose';

type Cache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose | 'file'> | null;
  engine: 'mongo' | 'file' | null;
};

const globalForMongo = globalThis as typeof globalThis & { __basarMongo?: Cache };

export function dbEngine() {
  return globalForMongo.__basarMongo?.engine || 'mongo';
}

function envUri() {
  return (process.env.MONGODB_URI || '').trim().replace(/^['"]|['"]$/g, '');
}

export async function db() {
  const cache = globalForMongo.__basarMongo || { conn: null, promise: null, engine: null };
  globalForMongo.__basarMongo = cache;
  if (cache.engine) return cache.conn;
  if (!cache.promise) {
    cache.promise = (async () => {
      const uri = envUri();
      const production = process.env.NODE_ENV === 'production';
      if (!uri) {
        if (production) throw new Error('MONGODB_URI must be set');
        cache.engine = 'file';
        cache.conn = null;
        return 'file' as const;
      }
      try {
        const conn = await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
        cache.engine = 'mongo';
        cache.conn = conn;
        return conn;
      } catch (error) {
        if (production) throw error;
        console.warn('[basar] Mongo unreachable, using local file database (.data/basar.json)');
        cache.engine = 'file';
        cache.conn = null;
        return 'file' as const;
      }
    })();
  }
  await cache.promise;
  return cache.conn;
}

export function serialize<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}
