'use server';

import { nestFetch, setAuthCookies, clearAuthCookies } from '@/lib/nest';
import type { AuthTokens, UserInfo } from '@/lib/types';
import { redirect } from 'next/navigation';

export async function checkPhone(phonenumber: string) {
  return nestFetch('/auth/check-number', {
    method: 'POST',
    body: JSON.stringify({ phoneNumber: phonenumber, phonenumber }),
    auth: false,
  });
}

export async function sendOtp(phonenumber: string) {
  return nestFetch('/auth/otp', {
    method: 'POST',
    body: JSON.stringify({ phonenumber }),
    auth: false,
  });
}

export async function loginWithOtp(form: { phonenumber: string; code: string; password?: string }) {
  const res = await nestFetch<AuthTokens>('/auth/get-token', {
    method: 'POST',
    body: JSON.stringify(form),
    auth: false,
  });
  if (res.ok && res.data) {
    await setAuthCookies(res.data);
  }
  return res;
}

export async function logout() {
  await nestFetch('/auth/sign-out', { method: 'GET' });
  await clearAuthCookies();
  redirect('/counting/login');
}

export async function getSessionUser() {
  const res = await nestFetch<UserInfo>('/user');
  if (!res.ok) {
    const fallback = await nestFetch<UserInfo>('/auth/user-info');
    return fallback;
  }
  return res;
}

export async function updateProfile(payload: Record<string, unknown>) {
  return nestFetch('/user', { method: 'PUT', body: JSON.stringify(payload) });
}

export async function activateSubscription(payload: Record<string, unknown>) {
  return nestFetch('/user/subscription', { method: 'POST', body: JSON.stringify(payload) });
}
