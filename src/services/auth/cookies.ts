export type CookieStore = {
  get: (name: string) => { value: string } | undefined;
};

type SameSite = 'Lax' | 'Strict' | 'None';

import { getTelcServicesConfig } from '../config';

function resolveDomain(domain?: string) {
  return domain ?? getTelcServicesConfig().cookieDomain;
}

export function setCookie(
  name: string,
  value: string,
  days: number,
  path: string = '/',
  domain?: string,
  secure?: boolean,
  sameSite: SameSite = 'Lax'
) {
  if (typeof document === 'undefined') return;

  const date = new Date();
  date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);

  let cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; Expires=${date.toUTCString()}; Path=${path}`;

  const resolvedDomain = resolveDomain(domain);
  if (resolvedDomain) cookie += `; Domain=${resolvedDomain}`;

  const isSecure =
    secure === undefined
      ? typeof window !== 'undefined'
        ? window.location.protocol === 'https:'
        : false
      : secure;

  if (isSecure) cookie += `; Secure`;
  cookie += `; SameSite=${sameSite}`;
  document.cookie = cookie;
}

export function getCookie(name: string) {
  if (typeof document === 'undefined') return null;
  const target = `${encodeURIComponent(name)}=`;
  const parts = document.cookie.split('; ');
  for (const p of parts) {
    if (p.startsWith(target)) {
      return decodeURIComponent(p.substring(target.length));
    } 
  }
  return null;
}

export function getCookieFromStore(store: CookieStore, key: string) {
  return store.get(key)?.value;
}

/** Adapter for Next.js `NextRequest` / middleware cookie APIs. */
export function cookieStoreFromNext(req: {
  cookies: { get: (name: string) => { value: string } | undefined };
}): CookieStore {
  return {
    get: (name) => req.cookies.get(name),
  };
}

export function deleteCookie(name: string, path: string = '/', domain?: string) {
  if (typeof document === 'undefined') return;
  let cookie = `${encodeURIComponent(name)}=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=${path}`;
  const resolvedDomain = resolveDomain(domain);
  if (resolvedDomain) cookie += `; Domain=${resolvedDomain}`;
  cookie += `; SameSite=Lax`;
  document.cookie = cookie;
}

const MAX_COOKIE_VALUE_LEN = 3800;

export function clearLargeCookie(name: string) {
  deleteCookie(`${name}.parts`);
  for (let i = 1; i <= 20; i++) {
    deleteCookie(`${name}.p${i}`);
  }
}

export function setLargeCookie(
  name: string,
  value: string,
  days: number,
  path: string = '/',
  domain?: string,
  secure?: boolean,
  sameSite: SameSite = 'Lax'
) {
  clearLargeCookie(name);
  const encoded = encodeURIComponent(value);
  const parts: string[] = [];
  for (let i = 0; i < encoded.length; i += MAX_COOKIE_VALUE_LEN) {
    parts.push(encoded.slice(i, i + MAX_COOKIE_VALUE_LEN));
  }

  const isSecure =
    secure === undefined
      ? typeof window !== 'undefined'
        ? window.location.protocol === 'https:'
        : false
      : secure;

  parts.forEach((part, idx) => {
    setCookie(
      `${name}.p${idx + 1}`,
      decodeURIComponent(part),
      days,
      path,
      domain,
      isSecure,
      sameSite
    );
  });
  setCookie(`${name}.parts`, String(parts.length), days, path, domain, isSecure, sameSite);
}

export function getLargeCookie(name: string) {
  const countStr = getCookie(`${name}.parts`);
  if (!countStr) return null;
  const count = Number(countStr);
  if (!count || count < 1) return null;
  let combined = '';
  for (let i = 1; i <= count; i++) {
    const part = getCookie(`${name}.p${i}`);
    if (part == null) return null;
    combined += encodeURIComponent(part);
  }
  try {
    return decodeURIComponent(combined);
  } catch {
    return null;
  }
}

export function getLargeCookieFromStore(store: CookieStore, name: string) {
  const partsCount = store.get(`${name}.parts`)?.value;
  if (!partsCount) return null;
  const count = Number(partsCount);
  if (!count || count < 1) return null;
  let combined = '';
  for (let i = 1; i <= count; i++) {
    const part = store.get(`${name}.p${i}`)?.value;
    if (!part) return null;
    combined += encodeURIComponent(part);
  }
  try {
    return decodeURIComponent(combined);
  } catch {
    return null;
  }
}
