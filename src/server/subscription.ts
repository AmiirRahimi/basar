import mongoose from 'mongoose';
import {
  cycleDays,
  cycleFromLegacy,
  planById,
  planFeatureFlags,
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
  allowProductShare: boolean;
  allowShareSms: boolean;
  notifyCustomersOnNewProduct: boolean;
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
  allowProductShare: false,
  allowShareSms: false,
  notifyCustomersOnNewProduct: false,
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
    ...planFeatureFlags(plan),
  };
}

export function denyPlanFeature(
  sub: SubscriptionSnapshot,
  feature: 'share' | 'share-sms' | 'product-sms',
) {
  if (!sub.active) return fail('اشتراک تمام شده است. فقط مشاهده ممکن است.', 403);
  if (feature === 'share' && !sub.allowProductShare) {
    return fail('ساخت لینک محصول در طرح اشتراک شما نیست. از تنظیمات طرح را ارتقا دهید.');
  }
  if (feature === 'share-sms' && !sub.allowShareSms) {
    return fail('ارسال لینک با پیامک در طرح فروشگاه‌ها و بالاتر است.');
  }
  if (feature === 'product-sms' && !sub.notifyCustomersOnNewProduct) {
    return fail('پیامک محصول جدید به مشتری در طرح شرکا و برندها است.');
  }
  return null;
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
      ...planFeatureFlags(plan),
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
  const discounted = await consumeDiscountCode(discountCode, originalPrice, session._id);
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

export async function adminSetSubscription(
  userId: string,
  payload: Record<string, unknown>,
): Promise<ActionResult> {
  await db();
  const user = await M().User.findById(userId).lean();
  if (!user) return fail('کاربر پیدا نشد', 404);

  const now = new Date();
  const rows = (await M().UserSubscription.find({ _userId: oid(userId) }).lean()) as any[];
  const overlapping = rows
    .filter((row) => new Date(row.endDate).getTime() > now.getTime())
    .sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime());

  const remainingRaw = payload.remainingDays;
  const hasRemaining = remainingRaw !== undefined && remainingRaw !== null && String(remainingRaw).trim() !== '';
  let remaining = hasRemaining
    ? Math.trunc(Number(remainingRaw))
    : overlapping[0]
      ? snapshotFromRow(overlapping[0]).remainingDays
      : cycleDays(payload.billingCycle === 'year' ? 'year' : 'month');
  if (!Number.isFinite(remaining)) return fail('تعداد روز مانده نامعتبر است');
  remaining = Math.max(0, Math.min(remaining, 3650));

  if (remaining === 0) {
    for (const row of overlapping) {
      await M().UserSubscription.updateOne({ _id: row._id }, { endDate: now });
    }
    return ok(null, overlapping.length ? 'اشتراک تمام شد' : '');
  }

  const planId = String(payload.planId || overlapping[0]?.planId || 'starter');
  const plan = planById(planId);
  if (!plan || plan.id !== planId) return fail('طرح اشتراک نامعتبر است');
  const cycle: BillingCycle = payload.billingCycle === 'year' ? 'year' : 'month';
  const endDate = new Date(now.getTime() + remaining * 24 * 60 * 60 * 1000);
  const originalPrice = planPrice(plan, cycle);
  const price =
    payload.price === undefined || payload.price === null || String(payload.price).trim() === ''
      ? 0
      : Math.max(0, Number(payload.price));
  if (!Number.isFinite(price)) return fail('مبلغ نامعتبر است');

  const next = {
    planId: plan.id,
    billingCycle: cycle,
    subscriptionType: cycle === 'year' ? 3 : 2,
    endDate,
    price,
    originalPrice,
    discountCode: '',
  };
  const keep = overlapping[0];
  for (const extra of overlapping.slice(1)) {
    await M().UserSubscription.updateOne({ _id: extra._id }, { endDate: now });
  }
  if (keep) {
    await M().UserSubscription.updateOne({ _id: keep._id }, next);
    return ok(serialize({ planId: plan.id, billingCycle: cycle, remainingDays: remaining, endDate }), 'اشتراک به‌روز شد');
  }
  await M().UserSubscription.create({
    _userId: oid(userId),
    ...next,
    startDate: now,
  });
  return ok(serialize({ planId: plan.id, billingCycle: cycle, remainingDays: remaining, endDate }), 'اشتراک فعال شد');
}
