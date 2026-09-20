import mongoose from 'mongoose';
import {
  addCalendarMonths,
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
    return fail('ساخت لینک محصول فقط در طرح ویترین است؛ این قابلیت مثل داشتن فروشگاه خودتان است. از تنظیمات طرح را ارتقا دهید.');
  }
  if (feature === 'share-sms' && !sub.allowShareSms) {
    return fail('ارسال لینک با پیامک در طرح ویترین است.');
  }
  if (feature === 'product-sms' && (!sub.notifyCustomersOnNewProduct || !sub.allowProductShare)) {
    return fail('پیامک محصول جدید به مشتری در طرح ویترین است.');
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

export async function previewPlanDiscount(
  session: Session,
  planId: string,
  cycle: BillingCycle,
  discountCode = '',
): Promise<ActionResult> {
  await db();
  const plan = planById(planId);
  if (!plan || plan.id !== planId) return fail('طرح اشتراک نامعتبر است');
  const originalPrice = planPrice(plan, cycle);
  const { consumeDiscountCode } = await import('./admin');
  const discounted = await consumeDiscountCode(discountCode, originalPrice, session._id);
  if (!discounted.ok) return fail(discounted.message);
  const percent =
    originalPrice > 0 ? Math.round((1 - discounted.price / originalPrice) * 100) : 0;
  return ok({
    planId: plan.id,
    billingCycle: cycle,
    originalPrice,
    price: discounted.price,
    code: discounted.code,
    percent,
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

function keepPrice(row: any) {
  return Number(row?.price || 0);
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

  const endSubscription = payload.endSubscription === true || payload.endSubscription === 'true';
  if (endSubscription) {
    for (const row of overlapping) {
      await M().UserSubscription.updateOne({ _id: row._id }, { endDate: now });
    }
    return ok(null, overlapping.length ? 'اشتراک تمام شد' : '');
  }

  const addRaw = payload.addMonths;
  const hasAdd = addRaw !== undefined && addRaw !== null && String(addRaw).trim() !== '';
  const addMonths = hasAdd ? Math.trunc(Number(addRaw)) : 0;
  if (hasAdd && (!Number.isFinite(addMonths) || addMonths < 0)) return fail('تعداد ماه نامعتبر است');
  if (addMonths > 120) return fail('تعداد ماه بیش از حد مجاز است');

  const planId = String(payload.planId || overlapping[0]?.planId || 'starter');
  const plan = planById(planId);
  if (!plan || plan.id !== planId) return fail('طرح اشتراک نامعتبر است');
  const cycle: BillingCycle =
    addMonths >= 12
      ? 'year'
      : payload.billingCycle === 'year' || payload.billingCycle === 'month'
        ? payload.billingCycle
        : cycleFromLegacy(Number(overlapping[0]?.subscriptionType || 0), overlapping[0]?.billingCycle);
  const originalPrice = addMonths > 0 ? plan.monthlyPrice * addMonths : planPrice(plan, cycle);
  const hasPrice = payload.price !== undefined && payload.price !== null && String(payload.price).trim() !== '';
  const price = hasPrice ? Math.max(0, Number(payload.price)) : addMonths > 0 ? originalPrice : keepPrice(overlapping[0]);
  if (!Number.isFinite(price)) return fail('مبلغ نامعتبر است');

  const keep = overlapping[0];
  for (const extra of overlapping.slice(1)) {
    await M().UserSubscription.updateOne({ _id: extra._id }, { endDate: now });
  }

  if (addMonths > 0) {
    const base =
      keep && new Date(keep.endDate).getTime() > now.getTime() ? new Date(keep.endDate) : now;
    const endDate = addCalendarMonths(base, addMonths);
    const next = {
      planId: plan.id,
      billingCycle: cycle,
      subscriptionType: cycle === 'year' ? 3 : 2,
      endDate,
      price,
      originalPrice,
      discountCode: '',
    };
    if (keep) {
      await M().UserSubscription.updateOne({ _id: keep._id }, next);
      return ok(
        serialize({ planId: plan.id, billingCycle: cycle, addMonths, endDate }),
        `${addMonths} ماه به اشتراک اضافه شد`,
      );
    }
    await M().UserSubscription.create({
      _userId: oid(userId),
      ...next,
      startDate: now,
    });
    return ok(
      serialize({ planId: plan.id, billingCycle: cycle, addMonths, endDate }),
      'اشتراک فعال شد',
    );
  }

  if (keep) {
    const next: Record<string, unknown> = {
      planId: plan.id,
      billingCycle: cycle,
      subscriptionType: cycle === 'year' ? 3 : 2,
    };
    if (hasPrice) {
      next.price = price;
      next.originalPrice = originalPrice;
    }
    await M().UserSubscription.updateOne({ _id: keep._id }, next);
    return ok(serialize({ planId: plan.id, billingCycle: cycle }), 'اشتراک به‌روز شد');
  }

  return ok(null, '');
}
