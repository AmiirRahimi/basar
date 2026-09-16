'use server';

import {
  createDiscountCode as createCode,
  deleteDiscountCode as removeCode,
  getAdminOverview as overview,
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
