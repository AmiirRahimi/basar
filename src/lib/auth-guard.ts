import { redirect } from 'next/navigation';

type Guardable = { ok: boolean; status?: number; message?: string };

export function isUnauthorized(res: Guardable) {
  return !res.ok && (res.status === 401 || res.message === 'وارد شوید');
}

/**
 * Sends the visitor back to the login screen when a server action reports an expired
 * session. A 401 leaves nothing useful to render, so the page should not try.
 */
export function guardSession(...results: Guardable[]) {
  if (results.some(isUnauthorized)) {
    redirect('/accounting/login');
  }
}

/** Toast text for a failed action. Auth failures redirect instead of rendering in the page. */
export function errorMessage(res: Guardable) {
  if (res.ok || isUnauthorized(res)) return undefined;
  return res.message || undefined;
}
