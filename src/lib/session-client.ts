'use client';

import { SESSION_EXPIRED_PARAM } from '@/lib/constants';

export function isUnauthorized(res: { ok: boolean; status?: number; message?: string }) {
  return !res.ok && (res.status === 401 || res.message === 'وارد شوید');
}

/** Leaves the current page and surfaces the expiry toast on the login screen. */
export function redirectIfUnauthorized(res: { ok: boolean; status?: number; message?: string }) {
  if (!isUnauthorized(res)) return false;
  window.location.assign(`/counting/login?${SESSION_EXPIRED_PARAM}=1`);
  return true;
}
