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
import { getWebsiteOrderBoard as websiteOrders, setWebsiteOrderStatus as setOrderStatus } from '@/server/website-orders';
import {
  getPlanCatalog as loadPlanCatalog,
  resetPlanCatalog as restorePlanCatalog,
  savePlanCatalog as persistPlanCatalog,
} from '@/server/plan-catalog';

export async function getAdminOverview() {
  return overview();
}

export async function getWebsiteOrderBoard() {
  return websiteOrders();
}

export async function setWebsiteOrderStatus(id: string, status: string) {
  return setOrderStatus(id, status);
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

export async function getPlanCatalog() {
  return loadPlanCatalog();
}

export async function savePlanCatalog(payload: {
  annualDiscount?: number;
  plans?: Array<Record<string, unknown>>;
}) {
  return persistPlanCatalog(payload as Parameters<typeof persistPlanCatalog>[0]);
}

export async function resetPlanCatalog() {
  return restorePlanCatalog();
}
