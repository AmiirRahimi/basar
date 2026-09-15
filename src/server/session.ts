import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { ACCESS_COOKIE, REFRESH_COOKIE, SESSION_DAYS, type StoreRole } from '@/lib/constants';
import { db } from './db';
import { failAuth, type ActionResult } from './result';

export type Session = {
  _id: string;
  phonenumber: string;
  _storeId: string;
  _brandId: string;
  storeRole: StoreRole;
  isPlatformAdmin?: boolean;
};

const COOKIE_MAX_AGE = SESSION_DAYS * 24 * 60 * 60;

function accessSecret() {
  return process.env.JWT_ACCESS_SECRET || 'dev-access-secret';
}
function refreshSecret() {
  return process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret';
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
  const expiresIn = `${SESSION_DAYS}d`;
  const accessToken = jwt.sign(payload, accessSecret(), { expiresIn });
  const refreshToken = jwt.sign(payload, refreshSecret(), { expiresIn });
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
  const cookie = { httpOnly: true, sameSite: 'lax' as const, path: '/', maxAge: COOKIE_MAX_AGE };
  if (access) jar.set(ACCESS_COOKIE, access, cookie);
  if (refresh) jar.set(REFRESH_COOKIE, refresh, cookie);
}

export async function clearAuthCookies() {
  const jar = await cookies();
  jar.delete(ACCESS_COOKIE);
  jar.delete(REFRESH_COOKIE);
}

function readPayload(token: string, secret: string): Session | null {
  try {
    const p = jwt.verify(token, secret) as jwt.JwtPayload;
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
  if (stored && stored !== refresh) return null;
  if (!stored) {
    await models.User.updateOne({ _id: session._id }, { refreshToken: refresh });
  }
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
  try {
    await setAuthCookies({ accessToken: signTokens(session).accessToken });
  } catch {
    // Server Components are not allowed to write cookies. The refresh cookie still
    // carries the session, so this request succeeds and the next Server Action refreshes it.
  }
  return session;
}

export async function requireSession(): Promise<{ session: Session } | { error: ActionResult }> {
  const session = await getSession();
  if (!session) return { error: failAuth() };
  return { session };
}
