'use client';

export function isUnauthorized(res: { ok: boolean; status?: number; message?: string }) {
  return !res.ok && (res.status === 401 || res.message === 'وارد شوید');
}

/** Sends an expired session back to login without a toast. */
export function redirectIfUnauthorized(res: { ok: boolean; status?: number; message?: string }) {
  if (!isUnauthorized(res)) return false;
  window.location.assign('/accounting/login');
  return true;
}
