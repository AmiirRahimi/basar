import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { ACCESS_COOKIE, REFRESH_COOKIE, SESSION_DAYS } from '@/lib/constants';
import { db, dbEngine } from './db';
import * as mongo from './models';
import { fileModels } from './file-db';
import { failAuth, type ActionResult } from './result';

function M() {
  return dbEngine() === 'file' ? fileModels : mongo;
}

export type Session = {
  _id: string;
  phonenumber: string;
  _storeId: string;
};

const COOKIE_MAX_AGE = SESSION_DAYS * 24 * 60 * 60;

function accessSecret() {
  return process.env.JWT_ACCESS_SECRET || 'dev-access-secret';
}
function refreshSecret() {
  return process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret';
}

export function signTokens(session: Session, sub = 'otp') {
  const payload = { sub, phonenumber: session.phonenumber, _id: session._id, _storeId: session._storeId };
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
    return { _id: String(p._id), phonenumber: String(p.phonenumber), _storeId: String(p._storeId || '') };
  } catch {
    return null;
  }
}

async function userForRefresh(session: Session, refresh: string) {
  const models = M() as any;
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
  const models = M() as any;
  const user = await userForRefresh(session, refresh);
  if (!user) return null;
  const store = await models.Store.findOne({ _userId: session._id }).lean();
  const next = { ...session, _storeId: String(store?._id || session._storeId) };
  // Mint a new access token but keep the existing refresh token. Rotating it here
  // without writing the new value to user.refreshToken would leave the cookie and
  // the user record out of sync, ending the 7-day window at the next expiry.
  try {
    await setAuthCookies({ accessToken: signTokens(next).accessToken });
  } catch {
    // Server Components are not allowed to write cookies. The refresh cookie still
    // carries the session, so this request succeeds and the next Server Action refreshes it.
  }
  return next;
}

export async function requireSession(): Promise<{ session: Session } | { error: ActionResult }> {
  const session = await getSession();
  if (!session) return { error: failAuth() };
  return { session };
}
