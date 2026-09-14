import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { ACCESS_COOKIE, REFRESH_COOKIE } from '@/lib/constants';
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

const ACCESS_MIN = 30;
const REFRESH_DAYS = 7;

function accessSecret() {
  return process.env.JWT_ACCESS_SECRET || 'dev-access-secret';
}
function refreshSecret() {
  return process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret';
}

export function signTokens(session: Session, sub = 'otp') {
  const payload = { sub, phonenumber: session.phonenumber, _id: session._id, _storeId: session._storeId };
  const accessToken = jwt.sign(payload, accessSecret(), { expiresIn: `${ACCESS_MIN}m` });
  const refreshToken = jwt.sign(payload, refreshSecret(), { expiresIn: `${REFRESH_DAYS}d` });
  return { accessToken, refreshToken };
}

export async function setAuthCookies(tokens: { accessToken?: string; refreshToken?: string; access?: string; refresh?: string }) {
  const jar = await cookies();
  const access = tokens.accessToken || tokens.access || '';
  const refresh = tokens.refreshToken || tokens.refresh || '';
  if (access) {
    jar.set(ACCESS_COOKIE, access, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: ACCESS_MIN * 60 });
  }
  if (refresh) {
    jar.set(REFRESH_COOKIE, refresh, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: REFRESH_DAYS * 24 * 60 * 60 });
  }
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
  const user = await M().User.findOne({ _id: session._id, refreshToken: refresh }).lean();
  if (!user) return null;
  const store = await M().Store.findOne({ _userId: session._id }).lean();
  const next = { ...session, _storeId: String(store?._id || session._storeId) };
  await setAuthCookies(signTokens(next));
  return next;
}

export async function requireSession(): Promise<{ session: Session } | { error: ActionResult }> {
  const session = await getSession();
  if (!session) return { error: failAuth() };
  return { session };
}
