'use server';

import {
  createDiscountCode as createCode,
  deleteDiscountCode as removeCode,
  getAdminOverview as overview,
  saveAdminUser as saveUser,
  setAdminSubscription as setSubscription,
  updateAdminUser as updateUser,
  updateDiscountCode as updateCode,
} from '@/server/admin';

export async function getAdminOverview() {
  return overview();
}

export async function createDiscountCode(payload: Record<string, unknown>) {
  return createCode(payload);
}

export async function updateDiscountCode(id: string, payload: Record<string, unknown>) {
  return updateCode(id, payload);
}

export async function deleteDiscountCode(id: string) {
  return removeCode(id);
}

export async function updateAdminUser(id: string, payload: Record<string, unknown>) {
  return updateUser(id, payload);
}

export async function setAdminSubscription(userId: string, payload: Record<string, unknown>) {
  return setSubscription(userId, payload);
}

export async function saveAdminUser(id: string, payload: Record<string, unknown>) {
  return saveUser(id, payload);
}
