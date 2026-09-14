const REMEMBER_ME_KEY = 'telc_remember_me';
const REMEMBERED_USERNAME_KEY = 'telc_remembered_username';

export function getRememberedLogin(): { rememberMe: boolean; username: string } {
  if (typeof window === 'undefined') {
    return { rememberMe: false, username: '' };
  }

  const rememberMe = localStorage.getItem(REMEMBER_ME_KEY) === 'true';
  const username = rememberMe ? localStorage.getItem(REMEMBERED_USERNAME_KEY) || '' : '';

  return { rememberMe, username };
}

export function saveRememberedLogin(username: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(REMEMBER_ME_KEY, 'true');
  localStorage.setItem(REMEMBERED_USERNAME_KEY, username);
}

export function clearRememberedLogin() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(REMEMBER_ME_KEY);
  localStorage.removeItem(REMEMBERED_USERNAME_KEY);
}
