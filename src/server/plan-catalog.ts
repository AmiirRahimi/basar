import {
  ANNUAL_DISCOUNT,
  mergePlanCatalog,
  planFromLegacy,
  planFromList,
  SUBSCRIPTION_PLANS,
  type PlanId,
  type SubscriptionPlan,
} from '@/lib/plans';
import { db, dbEngine, serialize } from './db';
import { fileModels } from './file-db';
import * as mongo from './models';
import { ok, type ActionResult } from './result';

const CATALOG_KEY = 'subscription-plans';

function M() {
  return dbEngine() === 'file' ? fileModels : mongo;
}

function catalogFilter() {
  return { key: CATALOG_KEY } as Record<string, string>;
}

async function requireAdmin() {
  const { requirePlatformAdmin } = await import('./admin');
  return requirePlatformAdmin('plans');
}

export type LivePlanCatalog = {
  annualDiscount: number;
  plans: SubscriptionPlan[];
};

let cache: { at: number; data: LivePlanCatalog } | null = null;

export function defaultPlanCatalog(): LivePlanCatalog {
  return mergePlanCatalog({ annualDiscount: ANNUAL_DISCOUNT, plans: SUBSCRIPTION_PLANS });
}

export function rememberPlanCatalog(data: LivePlanCatalog) {
  cache = { at: Date.now(), data };
}

export function cachedPlanCatalog(): LivePlanCatalog {
  return cache?.data || defaultPlanCatalog();
}

export function cachedPlanById(id?: string | null) {
  return planFromList(cachedPlanCatalog().plans, id);
}

export async function livePlanCatalog(force = false): Promise<LivePlanCatalog> {
  if (!force && cache && Date.now() - cache.at < 15_000) return cache.data;
  await db();
  const row = await M().PlanCatalog.findOne(catalogFilter()).lean();
  const data = mergePlanCatalog(row as { annualDiscount?: number; plans?: SubscriptionPlan[] } | null);
  rememberPlanCatalog(data);
  return data;
}

export async function livePlanById(id?: string | null) {
  const catalog = await livePlanCatalog();
  return planFromList(catalog.plans, id);
}

export async function getPlanCatalog(): Promise<ActionResult> {
  const access = await requireAdmin();
  if ('error' in access) return access.error;
  const catalog = await livePlanCatalog(true);
  return ok(serialize(catalog));
}

export async function savePlanCatalog(payload: {
  annualDiscount?: number;
  plans?: Array<Partial<SubscriptionPlan> & { id?: string }>;
}): Promise<ActionResult> {
  const access = await requireAdmin();
  if ('error' in access) return access.error;
  const data = mergePlanCatalog({
    annualDiscount: Number(payload.annualDiscount),
    plans: Array.isArray(payload.plans) ? payload.plans : [],
  });
  await db();
  const existing = await M().PlanCatalog.findOne(catalogFilter()).lean();
  if (existing?._id) {
    await M().PlanCatalog.findByIdAndUpdate(existing._id, {
      annualDiscount: data.annualDiscount,
      plans: data.plans,
      timeStamp: new Date(),
    });
  } else {
    await M().PlanCatalog.create({
      key: CATALOG_KEY,
      annualDiscount: data.annualDiscount,
      plans: data.plans,
      timeStamp: new Date(),
    });
  }
  rememberPlanCatalog(data);
  return ok(serialize(data), 'اطلاعات طرح‌ها ذخیره شد');
}

export async function resetPlanCatalog(): Promise<ActionResult> {
  const access = await requireAdmin();
  if ('error' in access) return access.error;
  await db();
  const existing = await M().PlanCatalog.findOne(catalogFilter()).lean();
  if (existing?._id) await M().PlanCatalog.findByIdAndDelete(existing._id);
  const data = defaultPlanCatalog();
  rememberPlanCatalog(data);
  return ok(serialize(data), 'طرح‌ها به پیش‌فرض برگشت');
}

export function planFromRow(row: { subscriptionType?: number; planId?: string }) {
  return planFromLegacy(Number(row?.subscriptionType || 0), row?.planId, cachedPlanCatalog().plans);
}

export const PLAN_IDS: PlanId[] = SUBSCRIPTION_PLANS.map((plan) => plan.id);
