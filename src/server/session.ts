import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { ACCESS_COOKIE, ACCESS_TOKEN_MINUTES, REFRESH_COOKIE, SESSION_DAYS, type StoreRole } from '@/lib/constants';
import { db } from './db';
import { failAuth, type ActionResult } from './result';

export type Session = {
  _id: string;
  phonenumber: string;
  _storeId: string;
  _brandId: string;
  storeRole: StoreRole;
  isPlatformAdmin?: boolean;
  subscriptionActive?: boolean;
};

const ACCESS_MAX_AGE = ACCESS_TOKEN_MINUTES * 60;
const REFRESH_MAX_AGE = SESSION_DAYS * 24 * 60 * 60;

function requiredSecret(name: 'JWT_ACCESS_SECRET' | 'JWT_REFRESH_SECRET') {
  const value = (process.env[name] || '').trim();
  if (value) return value;
  if (process.env.NODE_ENV === 'development') {
    console.warn(`[basar] ${name} is missing; using a development fallback`);
    return name === 'JWT_ACCESS_SECRET' ? 'dev-access-secret' : 'dev-refresh-secret';
  }
  throw new Error(`${name} must be set`);
}

function accessSecret() {
  return requiredSecret('JWT_ACCESS_SECRET');
}
function refreshSecret() {
  return requiredSecret('JWT_REFRESH_SECRET');
}

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
    secure: process.env.NODE_ENV === 'production',
  };
}

export function signTokens(session: Session, sub = 'otp') {
  const payload = {
    sub,
    phonenumber: session.phonenumber,
    _id: session._id,
    _storeId: session._storeId,
    _brandId: session._brandId,
    storeRole: session.storeRole,
  };
  const accessToken = jwt.sign(payload, accessSecret(), { expiresIn: `${ACCESS_TOKEN_MINUTES}m` });
  const refreshToken = jwt.sign(payload, refreshSecret(), { expiresIn: `${SESSION_DAYS}d` });
  return { accessToken, refreshToken };
}

export async function setAuthCookies(tokens: {
  accessToken?: string;
  refreshToken?: string;
  access?: string;
  refresh?: string;
}) {
  const jar = await cookies();
  const access = tokens.accessToken || tokens.access || '';
  const refresh = tokens.refreshToken || tokens.refresh || '';
  if (access) jar.set(ACCESS_COOKIE, access, cookieOptions(ACCESS_MAX_AGE));
  if (refresh) jar.set(REFRESH_COOKIE, refresh, cookieOptions(REFRESH_MAX_AGE));
}

export async function clearAuthCookies() {
  const jar = await cookies();
  jar.delete(ACCESS_COOKIE);
  jar.delete(REFRESH_COOKIE);
}

function readPayload(token: string, secret: string): Session | null {
  try {
    const p = jwt.verify(token, secret, { algorithms: ['HS256'] }) as jwt.JwtPayload;
    if (!p._id || !p.phonenumber) return null;
    const role = p.storeRole === 'admin' || p.storeRole === 'seller' || p.storeRole === 'other' ? p.storeRole : 'owner';
    return {
      _id: String(p._id),
      phonenumber: String(p.phonenumber),
      _storeId: String(p._storeId || ''),
      _brandId: String(p._brandId || ''),
      storeRole: role,
    };
  } catch {
    return null;
  }
}

async function userForRefresh(session: Session, refresh: string) {
  const { dbEngine } = await import('./db');
  const mongo = await import('./models');
  const { fileModels } = await import('./file-db');
  const models = (dbEngine() === 'file' ? fileModels : mongo) as any;
  const user = await models.User.findOne({ _id: session._id }).lean();
  if (!user) return null;
  const stored = user.refreshToken ? String(user.refreshToken) : '';
  if (!stored || stored !== refresh) return null;
  return user;
}

export async function getSession(): Promise<Session | null> {
  await db();
  const jar = await cookies();
  const access = jar.get(ACCESS_COOKIE)?.value;
  if (access) {
    const session = readPayload(access, accessSecret());
    if (session) return session;
  }
  const refresh = jar.get(REFRESH_COOKIE)?.value;
  if (!refresh) return null;
  const session = readPayload(refresh, refreshSecret());
  if (!session) return null;
  const user = await userForRefresh(session, refresh);
  if (!user) return null;
  const tokens = signTokens(session);
  const { dbEngine } = await import('./db');
  const mongo = await import('./models');
  const { fileModels } = await import('./file-db');
  const models = (dbEngine() === 'file' ? fileModels : mongo) as any;
  const fileDb = dbEngine() === 'file';
  const updated = await models.User.updateOne(
    fileDb ? { _id: session._id } : { _id: session._id, refreshToken: refresh },
    { refreshToken: tokens.refreshToken },
  );
  if (!fileDb && !Number(updated?.matchedCount ?? updated?.modifiedCount ?? 0)) return null;
  try {
    await setAuthCookies(tokens);
  } catch {
    // Server Components cannot write cookies. Put the previous refresh token back
    // so the browser cookie still matches the database.
    await models.User.updateOne({ _id: session._id, refreshToken: tokens.refreshToken }, { refreshToken: refresh });
  }
  return session;
}

export async function requireSession(): Promise<{ session: Session } | { error: ActionResult }> {
  const session = await getSession();
  if (!session) return { error: failAuth() };
  return { session };
}
