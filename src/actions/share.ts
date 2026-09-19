'use server';

import {
  createProductShare as createShare,
  deleteProductShare as removeShare,
  getPublicSharedClothes,
  listProductShares as listShares,
  sendProductShareSms as sendShareSms,
} from '@/server/domain';

export async function createProductShare(payload: { title?: string; clothIds: string[]; phone?: string }) {
  return createShare(payload);
}

export async function listProductShares() {
  return listShares();
}

export async function deleteProductShare(id: string) {
  return removeShare(id);
}

export async function sendProductShareSms(payload: { shareId: string; phone: string }) {
  return sendShareSms(payload);
}

export async function loadSharedClothes(token: string) {
  return getPublicSharedClothes(token);
}
