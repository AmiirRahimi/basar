import { redirect } from 'next/navigation';
import { SESSION_EXPIRED_PARAM } from '@/lib/constants';

export { SESSION_EXPIRED_PARAM };

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
    redirect(`/counting/login?${SESSION_EXPIRED_PARAM}=1`);
  }
}

/** Toast text for a failed action. Auth failures redirect instead of rendering in the page. */
export function errorMessage(res: Guardable) {
  if (res.ok || isUnauthorized(res)) return undefined;
  return res.message || undefined;
}
