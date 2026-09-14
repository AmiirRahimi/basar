'use client';

import { useCallback, useEffect, useState } from 'react';
import useApiRequest from './useApiRequest';
import type { UserPayload } from '../types';
import { getAuthEndpoint } from '../config';

/** Shared storage key — same across Super App and product apps. */
export const USER_DETAIL_STORAGE_KEY = 'userDetail';
export const USER_DETAIL_CHANGE_EVENT = 'user-detail-change';

function readUserFromStorage(): UserPayload {
  if (typeof window === 'undefined') return {} as UserPayload;
  const stored = localStorage.getItem(USER_DETAIL_STORAGE_KEY);
  if (!stored) {
    return { user: { username: 'defaultUser' } } as UserPayload;
  }
  try {
    return JSON.parse(stored) as UserPayload;
  } catch {
    return {} as UserPayload;
  }
}

function notifyUserDetailChange() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(USER_DETAIL_CHANGE_EVENT));
}

export type UseUserResult = {
  fetchUserDetail: () => Promise<void>;
  setUserDetail: (i: UserPayload) => void;
  clearUserDetail: () => void;
  user: UserPayload;
};

export function useUser(): UseUserResult {
  const [user, setUser] = useState<UserPayload>({} as UserPayload);
  const { request } = useApiRequest({ silent: true });

  const getUserDetail = useCallback(() => {
    if (typeof window === 'undefined') return {} as UserPayload;
    return JSON.parse(
      localStorage.getItem(USER_DETAIL_STORAGE_KEY) ||
        JSON.stringify({ user: { username: 'defaultUser' } })
    );
  }, []);

  const setUserDetail = (userDetail: UserPayload) => {
    const oldUserDetail = getUserDetail();
    const newUserDetail = { ...oldUserDetail, ...userDetail };
    localStorage.setItem(USER_DETAIL_STORAGE_KEY, JSON.stringify(newUserDetail));
    setUser(newUserDetail as UserPayload);
    notifyUserDetailChange();
  };

  const clearUserDetail = () => {
    localStorage.removeItem(USER_DETAIL_STORAGE_KEY);
    setUser({} as UserPayload);
    notifyUserDetailChange();
  };

  const fetchUserDetail = async () => {
    const detail = await request<UserPayload>({ url: getAuthEndpoint('USER_DETAIL'), method: 'GET' });
    const nextUser = detail?.payload;
    if (!nextUser) return;
    setUserDetail(nextUser);
    setUser(nextUser as UserPayload);
  };

  useEffect(() => {
    setUser(readUserFromStorage());

    const syncFromStorage = () => {
      setUser(readUserFromStorage());
    };

    const onStorage = (e: StorageEvent) => {
      if (e.key !== USER_DETAIL_STORAGE_KEY) return;
      syncFromStorage();
    };

    window.addEventListener(USER_DETAIL_CHANGE_EVENT, syncFromStorage);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(USER_DETAIL_CHANGE_EVENT, syncFromStorage);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  return { fetchUserDetail, user, setUserDetail, clearUserDetail };
}

export default useUser;
