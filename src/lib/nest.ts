import { cookies } from 'next/headers';
import { ACCESS_COOKIE, REFRESH_COOKIE } from './constants';
import type { AuthTokens, NestEnvelope } from './types';

function apiBase() {
  return (process.env.NEST_API_URL || process.env.NEXT_PUBLIC_NEST_API_URL || 'https://baasar-api.ir').replace(
    /\/+$/,
    '',
  );
}

function pickToken(tokens: AuthTokens | undefined) {
  return {
    access: tokens?.accessToken || tokens?.access || '',
    refresh: tokens?.refreshToken || tokens?.refresh || '',
  };
}

export async function setAuthCookies(tokens: AuthTokens) {
  const jar = await cookies();
  const { access, refresh } = pickToken(tokens);
  if (access) {
    jar.set(ACCESS_COOKIE, access, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 });
  }
  if (refresh) {
    jar.set(REFRESH_COOKIE, refresh, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 7 });
  }
}

export async function clearAuthCookies() {
  const jar = await cookies();
  jar.delete(ACCESS_COOKIE);
  jar.delete(REFRESH_COOKIE);
}

export async function getAccessToken() {
  return (await cookies()).get(ACCESS_COOKIE)?.value || '';
}

export function unwrap<T>(body: NestEnvelope<T> | T): { ok: boolean; data: T | null; message: string; raw: unknown } {
  if (body && typeof body === 'object' && 'hasError' in (body as NestEnvelope)) {
    const env = body as NestEnvelope<T>;
    const resVal = env.resVal as any;
    const data = (resVal?.result !== undefined ? resVal.result : resVal) as T;
    return {
      ok: !env.hasError,
      data: (data ?? null) as T | null,
      message: env.message || '',
      raw: env,
    };
  }
  return { ok: true, data: body as T, message: '', raw: body };
}

async function refreshAccess(): Promise<string> {
  const jar = await cookies();
  const refresh = jar.get(REFRESH_COOKIE)?.value;
  if (!refresh) return '';
  const res = await fetch(`${apiBase()}/auth/update-access-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: refresh }),
    cache: 'no-store',
  });
  if (!res.ok) return '';
  const json = unwrap<AuthTokens>(await res.json());
  const tokens = (json.data || {}) as AuthTokens;
  const { access } = pickToken(tokens);
  if (access) {
    jar.set(ACCESS_COOKIE, access, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 });
  }
  return access;
}

export async function nestFetch<T = unknown>(
  path: string,
  init: RequestInit & { auth?: boolean } = {},
): Promise<{ ok: boolean; data: T | null; message: string; status: number }> {
  const { auth = true, headers, ...rest } = init;
  const url = `${apiBase()}${path.startsWith('/') ? path : `/${path}`}`;
  let token = auth ? await getAccessToken() : '';

  const doFetch = async (access: string) =>
    fetch(url, {
      ...rest,
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        ...(access ? { Authorization: `Bearer ${access}` } : {}),
        ...headers,
      },
    });

  try {
    let res = await doFetch(token);
    if (auth && res.status === 401) {
      token = await refreshAccess();
      if (token) res = await doFetch(token);
    }
    const json = unwrap<T>(await res.json().catch(() => ({})));
    return { ok: res.ok && json.ok, data: json.data, message: json.message, status: res.status };
  } catch (error) {
    return {
      ok: false,
      data: null,
      message: error instanceof Error ? error.message : 'اتصال به سرور برقرار نشد',
      status: 0,
    };
  }
}

export async function nestList<T>(resource: string, page = 1, skip = 50, extra = '') {
  const qs = extra ? `&${extra}` : '';
  return nestFetch<T[]>(`/${resource}?page=${page}&skip=${skip}${qs}`);
}
