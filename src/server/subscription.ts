import mongoose from 'mongoose';
import {
  cycleDays,
  cycleFromLegacy,
  planById,
  planFromLegacy,
  planPrice,
  type BillingCycle,
  type PlanId,
} from '@/lib/plans';
import { db, dbEngine, serialize } from './db';
import { fileModels } from './file-db';
import * as mongo from './models';
import { fail, ok, type ActionResult } from './result';
import type { Session } from './session';

function M() {
  return dbEngine() === 'file' ? fileModels : mongo;
}

function oid(value: unknown) {
  if (value == null || value === '') return undefined;
  const s = String(value);
  return mongoose.Types.ObjectId.isValid(s) ? new mongoose.Types.ObjectId(s) : value;
}

export type SubscriptionSnapshot = {
  active: boolean;
  remainingDays: number;
  planId: PlanId;
  planName: string;
  billingCycle: BillingCycle;
  price?: number;
  startDate?: string;
  endDate?: string;
  maxBrands: number;
  maxStores: number;
  allowPartners: boolean;
};

const INACTIVE: SubscriptionSnapshot = {
  active: false,
  remainingDays: 0,
  planId: 'starter',
  planName: planById('starter').name,
  billingCycle: 'month',
  maxBrands: 0,
  maxStores: 0,
  allowPartners: false,
};

export function snapshotFromRow(row: any): SubscriptionSnapshot {
  const plan = planFromLegacy(Number(row?.subscriptionType || 0), row?.planId);
  const cycle = cycleFromLegacy(Number(row?.subscriptionType || 0), row?.billingCycle);
  const end = row?.endDate ? new Date(row.endDate) : null;
  const remainingDays = end ? Math.max(0, Math.ceil((end.getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 0;
  return {
    active: remainingDays > 0,
    remainingDays,
    planId: plan.id,
    planName: plan.name,
    billingCycle: cycle,
    price: Number(row?.price || 0),
    startDate: row?.startDate,
    endDate: row?.endDate,
    maxBrands: plan.maxBrands,
    maxStores: plan.maxStores,
    allowPartners: plan.allowPartners,
  };
}

export async function remainingDays(userId: string) {
  const snap = await activeSubscription(userId);
  return snap.remainingDays;
}

export async function activeSubscription(userId: string): Promise<SubscriptionSnapshot> {
  const row = await M()
    .UserSubscription.findOne({ _userId: oid(userId), endDate: { $gte: new Date() } })
    .sort({ endDate: -1 })
    .lean();
  if (!row) return { ...INACTIVE };
  return snapshotFromRow(row);
}

export async function subscriptionForSession(session: Session): Promise<SubscriptionSnapshot> {
  if (session.isPlatformAdmin || (process.env.ADMIN_PHONENUMBER && session.phonenumber === process.env.ADMIN_PHONENUMBER)) {
    const plan = planById('brands');
    return {
      active: true,
      remainingDays: 3650,
      planId: plan.id,
      planName: plan.name,
      billingCycle: 'year',
      maxBrands: plan.maxBrands,
      maxStores: plan.maxStores,
      allowPartners: true,
    };
  }
  const brand = session._brandId
    ? await M().Brand.findOne({ _id: oid(session._brandId), isDeleted: false }).lean()
    : null;
  const ownerId = brand?._userId ? String(brand._userId) : session._id;
  return activeSubscription(ownerId);
}

export async function listPurchases(userId: string) {
  const rows = await M().UserSubscription.find({ _userId: oid(userId) }).sort({ startDate: -1 }).lean();
  return rows.map((row: any) => {
    const snap = snapshotFromRow(row);
    return {
      _id: String(row._id),
      planId: snap.planId,
      planName: snap.planName,
      billingCycle: snap.billingCycle,
      price: Number(row.price || 0),
      startDate: row.startDate,
      endDate: row.endDate,
      active: snap.active,
    };
  });
}

export async function buyPlan(
  session: Session,
  planId: string,
  cycle: BillingCycle,
  discountCode = '',
): Promise<ActionResult> {
  await db();
  if (session.storeRole && session.storeRole !== 'owner' && !session.isPlatformAdmin) {
    return fail('فقط صاحب برند می‌تواند اشتراک بخرد', 403);
  }
  const plan = planById(planId);
  if (!plan || plan.id !== planId) return fail('طرح اشتراک نامعتبر است');
  const current = await activeSubscription(session._id);
  const now = Date.now();
  const startMs = current.active && current.endDate ? Math.max(now, new Date(current.endDate).getTime()) : now;
  const startDate = new Date(startMs);
  const endDate = new Date(startMs + cycleDays(cycle) * 24 * 60 * 60 * 1000);
  const originalPrice = planPrice(plan, cycle);
  const { consumeDiscountCode } = await import('./admin');
  const discounted = await consumeDiscountCode(discountCode, originalPrice);
  if (!discounted.ok) return fail(discounted.message);
  const created = await M().UserSubscription.create({
    _userId: oid(session._id),
    planId: plan.id,
    billingCycle: cycle,
    subscriptionType: cycle === 'year' ? 3 : 2,
    price: discounted.price,
    originalPrice,
    discountCode: discounted.code,
    startDate,
    endDate,
  });
  if (discounted.id) {
    const row = await M().DiscountCode.findById(discounted.id).lean();
    await M().DiscountCode.updateOne({ _id: oid(discounted.id) }, { usedCount: Number(row?.usedCount || 0) + 1 });
  }
  return ok(
    serialize({
      remainingDaysOfSubscription: snapshotFromRow(created.toObject ? created.toObject() : created).remainingDays,
      planId: plan.id,
      billingCycle: cycle,
      endDate,
      price: discounted.price,
    }),
    current.active ? 'اشتراک تمدید شد' : 'اشتراک فعال شد',
  );
}
