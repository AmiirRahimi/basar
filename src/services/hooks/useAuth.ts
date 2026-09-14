'use client';

import { clearTokenCookies } from '../auth/tokens';
import { loginWithUaa, type LoginOptions } from '../auth/login';
import useUser from './useUser';

export type UseAuthOptions = {
  /** Called after tokens + user are cleared (e.g. disconnect WS, navigate). */
  onLogout?: () => void | Promise<void>;
  /** Called after a successful login (e.g. fetch user detail, navigate). */
  onLoginSuccess?: () => void | Promise<void>;
};

export function useAuth(options: UseAuthOptions = {}) {
  const { clearUserDetail } = useUser();
  const { onLogout, onLoginSuccess } = options;

  const login = async (username: string, password: string, rememberMe = false) => {
    const result = await loginWithUaa(username, password, {
      rememberMe,
      allowDemo: true,
    } satisfies LoginOptions);

    if (!result.ok) {
      return { error: true as const };
    }

    await onLoginSuccess?.();
    return { ok: true as const, accessToken: result.accessToken, refreshToken: result.refreshToken };
  };

  const logOut = async () => {
    clearUserDetail();
    clearTokenCookies();
    await onLogout?.();
  };

  return { login, logOut };
}

export default useAuth;
