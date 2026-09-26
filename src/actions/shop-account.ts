'use server';

import {
  acceptCountingAddress as acceptDb,
  getShopAccount as accountDb,
  getShopViewer as viewerDb,
  loginShopWithOtp as loginDb,
  logoutShop as logoutDb,
  saveShopProfile as saveDb,
} from '@/server/shop-account';

export async function getShopViewer() {
  return viewerDb();
}

export async function getShopAccount() {
  return accountDb();
}

export async function loginShopWithOtp(phonenumber: string, code: string) {
  return loginDb(phonenumber, code);
}

export async function logoutShop() {
  return logoutDb();
}

export async function saveShopProfile(input: {
  fullName?: string;
  email?: string;
  city?: string;
  address?: string;
  postalCode?: string;
  landlines?: string[];
}) {
  return saveDb(input);
}

export async function acceptCountingAddress(id: string) {
  return acceptDb(id);
}
