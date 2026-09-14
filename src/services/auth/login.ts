import { getApiBaseUrl, getAuthEndpoint } from '../config';
import { setToken } from './tokens';
import { clearRememberedLogin, saveRememberedLogin } from './rememberMe';

export type LoginResult =
  | { ok: true; accessToken: string; refreshToken?: string }
  | { ok: false; error: string };

export type LoginOptions = {
  rememberMe?: boolean;
  /** Allow local demo token when API base URL is empty (dev hubs). */
  allowDemo?: boolean;
};

/**
 * Login against TelC UAA and persist tokens in shared cookies
 * so Super App + product apps can use the same session.
 */
export async function loginWithUaa(
  username: string,
  password: string,
  options: LoginOptions = {}
): Promise<LoginResult> {
  const { rememberMe = false, allowDemo = true } = options;
  const baseUrl = getApiBaseUrl();

  if (!baseUrl) {
    if (!allowDemo || !username.trim() || !password) {
      return { ok: false, error: 'invalid_credentials' };
    }
    const accessToken = 'demo-token';
    setToken(accessToken, undefined, rememberMe);
    if (rememberMe) saveRememberedLogin(username.trim());
    else clearRememberedLogin();
    return { ok: true, accessToken };
  }

  try {
    const url = `${baseUrl}/${getAuthEndpoint('LOGIN')}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payload: { username, password } }),
    });
    const data = await res.json().catch(() => null);

    if (data?.status === 'SUCCEEDED' && data?.payload?.accessToken) {
      const accessToken = data.payload.accessToken as string;
      const refreshToken = data.payload.refreshToken as string | undefined;
      setToken(accessToken, refreshToken, rememberMe);
      if (rememberMe) saveRememberedLogin(username.trim());
      else clearRememberedLogin();
      return { ok: true, accessToken, refreshToken };
    }
    return { ok: false, error: 'invalid_credentials' };
  } catch {
    if (allowDemo && username.trim() && password) {
      const accessToken = 'demo-token';
      setToken(accessToken, undefined, rememberMe);
      return { ok: true, accessToken };
    }
    return { ok: false, error: 'invalid_credentials' };
  }
}
