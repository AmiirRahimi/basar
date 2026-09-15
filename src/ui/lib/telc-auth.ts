/** Local stand-in for `@telc/services/auth` so SignInPage can live in this repo. */

const USERNAME_KEY = 'telc_remembered_username';

export function setToken(
  _accessToken: string,
  _refreshToken?: string,
  _rememberMe?: boolean,
) {
  /* Host apps persist tokens via httpOnly cookies or onLoginSuccess. */
}

export function getRememberedLogin() {
  if (typeof window === 'undefined') return { username: '', rememberMe: false };
  const username = window.localStorage.getItem(USERNAME_KEY) || '';
  return { username, rememberMe: Boolean(username) };
}

export function saveRememberedLogin(username: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(USERNAME_KEY, username);
}

export function clearRememberedLogin() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(USERNAME_KEY);
}

export function useUser() {
  return {
    fetchUserDetail: async () => undefined,
  };
}
