import {
  setCookie,
  getCookie,
  deleteCookie,
  getCookieFromStore,
  setLargeCookie,
  getLargeCookie,
  getLargeCookieFromStore,
  clearLargeCookie,
  type CookieStore,
} from './cookies';
import { enc, dec } from './hash';
import { getRememberedLogin } from './rememberMe';
import { getApiBaseUrlIvr, getAuthEndpoint } from '../config';

export function setAccessTokenCookie(token: string, days = 1) {
  try {
    const encVal = enc(token) || '';
    if (encVal.length <= 3000) {
      setCookie('accessToken', encVal, days);
    } else {
      setLargeCookie('accessToken', encVal, days);
    }
    setCookie('token', '1', days);
  } catch (error) {
    console.error('Error setting access token cookie:', error);
  }
}

export function setRefreshTokenCookie(token: string, days = 7) {
  setCookie('refreshToken', enc(token), days);
}

export function setToken(accessToken: string, refreshToken?: string, rememberMe = true) {
  const accessDays = rememberMe ? 7 : 1;
  const refreshDays = rememberMe ? 30 : 1;

  setAccessTokenCookie(accessToken, accessDays);
  if (refreshToken) setRefreshTokenCookie(refreshToken, refreshDays);
}

export function getAccessTokenCookie(store?: CookieStore) {
  const v = store
    ? (getLargeCookieFromStore(store, 'accessToken') ?? getCookieFromStore(store, 'accessToken'))
    : (getLargeCookie('accessToken') ?? getCookie('accessToken'));

  if (!v) return null;
  return dec(v);
}

export function getRefreshTokenCookie(store?: CookieStore) {
  const v = store ? getCookieFromStore(store, 'refreshToken') : getCookie('refreshToken');
  if (!v) return null;
  return dec(v);
}

export function decodeJwtPayload(token: string) {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const atobFn = (globalThis as { atob?: (data: string) => string }).atob;
    if (!atobFn) return null;
    const raw = atobFn(b64);
    const json = decodeURIComponent(
      raw
        .split('')
        .map((c: string) => `%${('00' + c.charCodeAt(0).toString(16)).slice(-2)}`)
        .join('')
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function getTokenExpireTime(token: string) {
  if (!token) return null;
  const payload = decodeJwtPayload(token);
  const exp = payload && typeof payload.exp === 'number' ? payload.exp : null;
  return exp ? exp * 1000 : null;
}

export function isTokenValid(store?: CookieStore) {
  const a = getAccessTokenCookie(store);
  const r = getRefreshTokenCookie(store);
  const now = Date.now();

  if (!a) {
    return { isAccessTokenValid: false, isRefreshTokenValid: false };
  }

  const aExp = getTokenExpireTime(a);
  const rExp = r && aExp ? aExp + 6 * 24 * 60 * 60 * 1000 : null;

  return {
    isAccessTokenValid: !!aExp && aExp > now,
    isRefreshTokenValid: !!rExp && rExp > now,
  };
}

export function clearTokenCookies() {
  clearLargeCookie('accessToken');
  deleteCookie('accessToken');
  deleteCookie('refreshToken');
  deleteCookie('token');
}

export function hasAuthPresenceCookie() {
  return getCookie('token') === '1';
}

async function refreshAccessToken(
  refreshFn: (refreshToken: string) => Promise<{ accessToken: string; refreshToken?: string } | null>,
  store?: CookieStore
) {
  const rt = getRefreshTokenCookie(store);
  if (!rt) return null;
  const res = await refreshFn(rt);
  if (res?.accessToken) {
    const rememberMe = getRememberedLogin().rememberMe;
    const accessDays = rememberMe ? 7 : 1;
    const refreshDays = rememberMe ? 30 : 1;
    setAccessTokenCookie(res.accessToken, accessDays);
    if (res.refreshToken) setRefreshTokenCookie(res.refreshToken, refreshDays);
    return res.accessToken;
  }
  return null;
}

export async function ensureAccessToken(
  refreshFn: (
    refreshToken: string
  ) => Promise<{ accessToken: string; refreshToken?: string } | null>,
  store?: CookieStore
) {
  const { isAccessTokenValid, isRefreshTokenValid } = isTokenValid(store);

  if (isAccessTokenValid) return true;
  if (!isRefreshTokenValid || !refreshFn) return false;

  const next = await refreshAccessToken(refreshFn, store);
  return !!next;
}

export async function refreshTokens(
  refreshToken: string
): Promise<{ accessToken: string; refreshToken?: string } | null> {
  try {
    const url = `${getApiBaseUrlIvr()}/${getAuthEndpoint('REFRESH')}/${refreshToken}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-request-id': 'CMI-Test',
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const accessToken = data?.accessToken ?? data?.payload?.accessToken ?? null;
    const newRefreshToken = data?.refreshToken ?? data?.payload?.refreshToken ?? undefined;
    if (!accessToken) return null;
    return { accessToken, refreshToken: newRefreshToken };
  } catch {
    return null;
  }
}
