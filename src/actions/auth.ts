'use server';

import { redirect } from 'next/navigation';
import {
  activateSubscription as activate,
  previewSubscriptionDiscount as previewDiscount,
  checkPhone as checkPhoneDb,
  getSessionUser as sessionUser,
  listUsers as usersDb,
  loginWithOtp as loginDb,
  logout as logoutDb,
  sendOtp as sendOtpDb,
  updateProfile as updateProfileDb,
} from '@/server/auth';

export async function checkPhone(phonenumber: string) {
  return checkPhoneDb(phonenumber);
}

export async function sendOtp(phonenumber: string) {
  return sendOtpDb(phonenumber);
}

export async function loginWithOtp(form: { phonenumber: string; code: string; password?: string }) {
  const res = await loginDb(form);
  if (res.ok) redirect('/counting/dashboard');
  return res;
}

export async function logout() {
  await logoutDb();
  redirect('/counting/login');
}

export async function getSessionUser() {
  return sessionUser();
}

export async function updateProfile(payload: Record<string, unknown>) {
  return updateProfileDb(payload);
}

export async function activateSubscription(payload: Record<string, unknown>) {
  return activate(payload);
}

export async function previewSubscriptionDiscount(payload: Record<string, unknown>) {
  return previewDiscount(payload);
}

export async function listAuthUsers(page = 1, skip = 50) {
  return usersDb(page, skip);
}
