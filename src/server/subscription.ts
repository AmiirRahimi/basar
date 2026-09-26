import mongoose from 'mongoose';
import {
  PERIOD_MS,
  addPeriods,
  cycleFromLegacy,
  cyclePeriods,
  planFeatureFlags,
  planPrice,
  resolvePlanId,
  type BillingCycle,
  type PlanId,
} from '@/lib/plans';
import { cachedPlanById, livePlanById, livePlanCatalog, planFromRow } from './plan-catalog';
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
  remainingPeriods: number;
  /** Fractional 30-day units left (for credit); integer display uses remainingPeriods. */
  remainingPeriodUnits: number;
  planId: PlanId;
  planName: string;
  billingCycle: BillingCycle;
  price?: number;
  periodsPurchased?: number;
  startDate?: string;
  currentPeriodStart?: string;
  endsAt?: string;
  maxBrands: number;
  maxStores: number;
  allowPartners: boolean;
  allowMembers: boolean;
  allowClothImages: boolean;
  allowProductShare: boolean;
  allowShareSms: boolean;
  notifyCustomersOnNewProduct: boolean;
};

function inactiveSnapshot(): SubscriptionSnapshot {
  return {
    active: false,
    remainingPeriods: 0,
    remainingPeriodUnits: 0,
    planId: 'starter',
    planName: cachedPlanById('starter').name,
    billingCycle: 'month',
    maxBrands: 0,
    maxStores: 0,
    allowPartners: false,
    allowMembers: false,
    allowClothImages: false,
    allowProductShare: false,
    allowShareSms: false,
    notifyCustomersOnNewProduct: false,
  };
}

type SyncedPeriods = {
  remainingPeriods: number;
  currentPeriodStart: Date | null;
  dirty: boolean;
};

/** Burn whole 30-day units that already elapsed. */
export function syncRemainingPeriods(row: {
  remainingPeriods?: number;
  currentPeriodStart?: Date | string | null;
  endDate?: Date | string | null;
  startDate?: Date | string | null;
  billingCycle?: string;
  subscriptionType?: number;
  periodsPurchased?: number;
}): SyncedPeriods {
  let remaining = Number(row?.remainingPeriods);
  if (!Number.isFinite(remaining)) remaining = NaN;
  else remaining = Math.max(0, Math.trunc(remaining));
  let start = row?.currentPeriodStart ? new Date(row.currentPeriodStart) : null;
  if ((!start || Number.isNaN(start.getTime())) && remaining > 0 && row?.startDate) {
    start = new Date(row.startDate);
  }

  // Legacy day-based rows (endDate only) — convert once when reading pre-migration data.
  if (!Number.isFinite(remaining) || (remaining <= 0 && !start && row?.endDate)) {
    const end = row.endDate ? new Date(row.endDate) : null;
    if (end && end.getTime() > Date.now()) {
      const msLeft = end.getTime() - Date.now();
      remaining = Math.max(1, Math.ceil(msLeft / PERIOD_MS));
      start = new Date(end.getTime() - remaining * PERIOD_MS);
      return { remainingPeriods: remaining, currentPeriodStart: start, dirty: true };
    }
    return { remainingPeriods: 0, currentPeriodStart: null, dirty: Boolean(row?.endDate || row?.remainingPeriods) };
  }

  if (remaining <= 0 || !start || Number.isNaN(start.getTime())) {
    return { remainingPeriods: 0, currentPeriodStart: null, dirty: remaining !== 0 || Boolean(start) };
  }

  const now = Date.now();
  let elapsed = now - start.getTime();
  if (elapsed < 0) elapsed = 0;
  const consumed = Math.floor(elapsed / PERIOD_MS);
  if (consumed <= 0) {
    return { remainingPeriods: remaining, currentPeriodStart: start, dirty: false };
  }
  const nextRemaining = Math.max(0, remaining - consumed);
  const nextStart = nextRemaining > 0 ? new Date(start.getTime() + consumed * PERIOD_MS) : null;
  return { remainingPeriods: nextRemaining, currentPeriodStart: nextStart, dirty: true };
}

function periodUnitsLeft(remainingPeriods: number, currentPeriodStart: Date | null) {
  if (remainingPeriods <= 0 || !currentPeriodStart) return 0;
  const elapsed = Math.max(0, Date.now() - currentPeriodStart.getTime());
  const used = Math.min(1, elapsed / PERIOD_MS);
  return Math.max(0, remainingPeriods - used);
}

function endsAtFrom(remainingPeriods: number, currentPeriodStart: Date | null) {
  if (remainingPeriods <= 0 || !currentPeriodStart) return undefined;
  return addPeriods(currentPeriodStart, remainingPeriods);
}

export function snapshotFromRow(row: any): SubscriptionSnapshot & { remainingDays: number; endDate?: string } {
  const plan = planFromRow(row);
  const cycle = cycleFromLegacy(Number(row?.subscriptionType || 0), row?.billingCycle);
  const synced = syncRemainingPeriods(row);
  const units = periodUnitsLeft(synced.remainingPeriods, synced.currentPeriodStart);
  const endsAt = endsAtFrom(synced.remainingPeriods, synced.currentPeriodStart);
  return {
    active: synced.remainingPeriods > 0,
    remainingPeriods: synced.remainingPeriods,
    remainingPeriodUnits: units,
    remainingDays: synced.remainingPeriods,
    planId: plan.id,
    planName: plan.name,
    billingCycle: cycle,
    price: Number(row?.price || 0),
    periodsPurchased: Math.max(0, Math.trunc(Number(row?.periodsPurchased || cyclePeriods(cycle)))),
    startDate: row?.startDate,
    currentPeriodStart: synced.currentPeriodStart?.toISOString?.() || synced.currentPeriodStart || undefined,
    endsAt: endsAt?.toISOString(),
    endDate: endsAt?.toISOString(),
    maxBrands: plan.maxBrands,
    maxStores: plan.maxStores,
    ...planFeatureFlags(plan),
  };
}

async function persistSyncedRow(row: any, synced: SyncedPeriods) {
  if (!synced.dirty || !row?._id) return;
  await M().UserSubscription.updateOne(
    { _id: row._id },
    {
      remainingPeriods: synced.remainingPeriods,
      currentPeriodStart: synced.currentPeriodStart,
    },
  );
}

export function denyPlanFeature(
  sub: SubscriptionSnapshot,
  feature: 'share' | 'share-sms' | 'product-sms' | 'cloth-images' | 'partners' | 'members',
) {
  if (!sub.active) return fail('اشتراک تمام شده است. فقط مشاهده ممکن است.', 403);
  if (feature === 'cloth-images' && !sub.allowClothImages) {
    return fail('ثبت تصویر لباس فقط در طرح ویترین است. طرح را ارتقا دهید.');
  }
  if (feature === 'partners' && !sub.allowPartners) {
    return fail('ثبت شریک در این طرح نیست. طرح فروشگاه و شرکا یا ویترین را فعال کنید.');
  }
  if (feature === 'members' && !sub.allowMembers) {
    return fail('افزودن عضو در این طرح نیست. طرح فروشگاه و شرکا یا ویترین را فعال کنید.');
  }
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

export async function remainingPeriods(userId: string) {
  const snap = await activeSubscription(userId);
  return snap.remainingPeriods;
}

/** @deprecated use remainingPeriods */
export async function remainingDays(userId: string) {
  return remainingPeriods(userId);
}

export async function activeSubscription(userId: string): Promise<SubscriptionSnapshot> {
  await livePlanCatalog();
  const rows = (await M()
    .UserSubscription.find({ _userId: oid(userId) })
    .sort({ startDate: -1 })
    .lean()) as any[];
  for (const row of rows) {
    const synced = syncRemainingPeriods(row);
    await persistSyncedRow(row, synced);
    if (synced.remainingPeriods > 0) {
      return snapshotFromRow({ ...row, ...synced });
    }
  }
  return inactiveSnapshot();
}

export async function subscriptionForSession(session: Session): Promise<SubscriptionSnapshot> {
  if (session.isPlatformAdmin || (process.env.ADMIN_PHONENUMBER && session.phonenumber === process.env.ADMIN_PHONENUMBER)) {
    const plan = await livePlanById('brands');
    return {
      active: true,
      remainingPeriods: 999,
      remainingPeriodUnits: 999,
      planId: plan.id,
      planName: plan.name,
      billingCycle: 'year',
      periodsPurchased: 12,
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
  await livePlanCatalog();
  const rows = await M().UserSubscription.find({ _userId: oid(userId) }).sort({ startDate: -1 }).lean();
  return rows.map((row: any) => {
    const snap = snapshotFromRow(row);
    return {
      _id: String(row._id),
      planId: snap.planId,
      planName: snap.planName,
      billingCycle: snap.billingCycle,
      price: Number(row.price || 0),
      periodsPurchased: snap.periodsPurchased || cyclePeriods(snap.billingCycle),
      remainingPeriods: snap.remainingPeriods,
      startDate: row.startDate,
      endsAt: snap.endsAt,
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
  const quote = await quoteSubscriptionPrice(session, planId, cycle, discountCode);
  if ('error' in quote) return quote.error;
  const { plan, catalogPrice, afterDiscount, payable, discount, credit } = quote;
  const percent =
    catalogPrice > 0 && discount.code
      ? Math.round((1 - afterDiscount / catalogPrice) * 100)
      : 0;
  return ok({
    planId: plan.id,
    billingCycle: cycle,
    originalPrice: catalogPrice,
    catalogPrice,
    afterDiscount,
    price: payable,
    code: discount.code,
    percent,
    remainingPeriods: credit.remainingPeriods,
    remainingPeriodUnits: credit.remainingPeriodUnits,
    remainingCredit: credit.credit,
    currentPlanName: credit.planName,
  });
}

type RemainingCredit = {
  remainingPeriods: number;
  remainingPeriodUnits: number;
  credit: number;
  paidPrice: number;
  unitPrice: number;
  planName: string;
};

function remainingSubscriptionCredit(
  current: SubscriptionSnapshot,
  catalogPriceFallback: number,
): RemainingCredit {
  if (!current.active || current.remainingPeriodUnits <= 0) {
    return {
      remainingPeriods: 0,
      remainingPeriodUnits: 0,
      credit: 0,
      paidPrice: 0,
      unitPrice: 0,
      planName: '',
    };
  }
  const purchased = Math.max(1, Number(current.periodsPurchased) || cyclePeriods(current.billingCycle));
  const paidPrice = Math.max(0, Number(current.price) || 0) || Math.max(0, catalogPriceFallback);
  const unitPrice = paidPrice / purchased;
  const credit = Math.min(paidPrice, Math.round(current.remainingPeriodUnits * unitPrice));
  return {
    remainingPeriods: current.remainingPeriods,
    remainingPeriodUnits: current.remainingPeriodUnits,
    credit,
    paidPrice,
    unitPrice,
    planName: current.planName || '',
  };
}

async function quoteSubscriptionPrice(
  session: Session,
  planId: string,
  cycle: BillingCycle,
  discountCode = '',
) {
  const catalog = await livePlanCatalog();
  const plan = catalog.plans.find((row) => row.id === resolvePlanId(planId));
  if (!plan) return { error: fail('طرح اشتراک نامعتبر است') as ActionResult };
  const current = await activeSubscription(session._id);
  const currentCatalogPrice = current.active
    ? planPrice(
        catalog.plans.find((row) => row.id === resolvePlanId(current.planId)) || planFromRow({ planId: current.planId }),
        current.billingCycle,
        catalog.annualDiscount,
      )
    : 0;
  const credit = remainingSubscriptionCredit(current, currentCatalogPrice);
  const catalogPrice = planPrice(plan, cycle, catalog.annualDiscount);
  const { consumeDiscountCode } = await import('./admin');
  const discounted = await consumeDiscountCode(discountCode, catalogPrice, session._id);
  if (!discounted.ok) return { error: fail(discounted.message) as ActionResult };
  const afterDiscount = Math.max(0, Math.round(Number(discounted.price) || 0));
  const payable = Math.max(0, afterDiscount - credit.credit);
  return {
    plan,
    catalog,
    current,
    credit,
    catalogPrice,
    afterDiscount,
    payable,
    discount: discounted,
  };
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
  const quote = await quoteSubscriptionPrice(session, planId, cycle, discountCode);
  if ('error' in quote) return quote.error;
  const { plan, current, credit, catalogPrice, payable, discount } = quote;
  if (discount.id) {
    const { commitDiscountUse } = await import('./admin');
    const committed = await commitDiscountUse(discount.id);
    if (!committed.ok) return fail(committed.message);
  }

  const now = new Date();
  const periods = cyclePeriods(cycle);
  // Active leftover is converted to credit, so the new stack starts now.
  if (current.active) {
    await M().UserSubscription.updateMany(
      { _userId: oid(session._id), remainingPeriods: { $gt: 0 } },
      { remainingPeriods: 0, currentPeriodStart: null },
    );
    // Legacy rows keyed by endDate
    await M().UserSubscription.updateMany(
      { _userId: oid(session._id), endDate: { $gte: now } },
      { remainingPeriods: 0, currentPeriodStart: null, endDate: now },
    );
  }
  const created = await M().UserSubscription.create({
    _userId: oid(session._id),
    planId: plan.id,
    billingCycle: cycle,
    subscriptionType: cycle === 'year' ? 3 : 2,
    periodsPurchased: periods,
    remainingPeriods: periods,
    currentPeriodStart: now,
    price: payable,
    originalPrice: catalogPrice,
    discountCode: discount.code,
    remainingCredit: credit.credit || undefined,
    startDate: now,
  });
  const snap = snapshotFromRow(created.toObject ? created.toObject() : created);
  const message =
    credit.credit > 0
      ? 'اشتراک فعال شد؛ ارزش اشتراک‌های مانده از مبلغ کم شد'
      : current.active
        ? 'اشتراک تمدید شد'
        : 'اشتراک فعال شد';
  return ok(
    serialize({
      remainingPeriods: snap.remainingPeriods,
      remainingPeriodsOfSubscription: snap.remainingPeriods,
      planId: plan.id,
      billingCycle: cycle,
      periodsPurchased: periods,
      endsAt: snap.endsAt,
      price: payable,
      remainingCredit: credit.credit,
    }),
    message,
  );
}

function keepPrice(row: any) {
  return Number(row?.price || 0);
}

async function activeRowsForUser(userId: string) {
  const now = new Date();
  const rows = (await M().UserSubscription.find({ _userId: oid(userId) }).lean()) as any[];
  const active: any[] = [];
  for (const row of rows) {
    const synced = syncRemainingPeriods(row);
    await persistSyncedRow(row, synced);
    if (synced.remainingPeriods > 0) {
      active.push({ ...row, ...synced });
    } else if (row.endDate && new Date(row.endDate).getTime() > now.getTime() && !row.remainingPeriods) {
      // handled by syncRemainingPeriods legacy branch
    }
  }
  return active.sort(
    (a, b) => new Date(b.currentPeriodStart || b.startDate).getTime() - new Date(a.currentPeriodStart || a.startDate).getTime(),
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
  const overlapping = await activeRowsForUser(userId);

  const endSubscription = payload.endSubscription === true || payload.endSubscription === 'true';
  if (endSubscription) {
    for (const row of overlapping) {
      await M().UserSubscription.updateOne(
        { _id: row._id },
        { remainingPeriods: 0, currentPeriodStart: null },
      );
    }
    return ok(null, overlapping.length ? 'اشتراک تمام شد' : '');
  }

  const addRaw = payload.addMonths ?? payload.addPeriods;
  const hasAdd = addRaw !== undefined && addRaw !== null && String(addRaw).trim() !== '';
  const addPeriodsCount = hasAdd ? Math.trunc(Number(addRaw)) : 0;
  if (hasAdd && (!Number.isFinite(addPeriodsCount) || addPeriodsCount < 0)) {
    return fail('تعداد اشتراک نامعتبر است');
  }
  if (addPeriodsCount > 120) return fail('تعداد اشتراک بیش از حد مجاز است');

  const planId = resolvePlanId(String(payload.planId || overlapping[0]?.planId || 'starter')) || 'starter';
  const catalog = await livePlanCatalog();
  const plan = catalog.plans.find((row) => row.id === planId);
  if (!plan) return fail('طرح اشتراک نامعتبر است');
  const cycle: BillingCycle =
    addPeriodsCount >= 12
      ? 'year'
      : payload.billingCycle === 'year' || payload.billingCycle === 'month'
        ? payload.billingCycle
        : cycleFromLegacy(Number(overlapping[0]?.subscriptionType || 0), overlapping[0]?.billingCycle);
  const originalPrice =
    addPeriodsCount > 0 ? plan.monthlyPrice * addPeriodsCount : planPrice(plan, cycle, catalog.annualDiscount);
  const hasPrice = payload.price !== undefined && payload.price !== null && String(payload.price).trim() !== '';
  const price =
    hasPrice ? Math.max(0, Number(payload.price)) : addPeriodsCount > 0 ? originalPrice : keepPrice(overlapping[0]);
  if (!Number.isFinite(price)) return fail('مبلغ نامعتبر است');

  const keep = overlapping[0];
  for (const extra of overlapping.slice(1)) {
    await M().UserSubscription.updateOne(
      { _id: extra._id },
      { remainingPeriods: 0, currentPeriodStart: null },
    );
  }

  if (addPeriodsCount > 0) {
    const baseRemaining = keep ? Math.max(0, Number(keep.remainingPeriods) || 0) : 0;
    const nextRemaining = baseRemaining + addPeriodsCount;
    const currentPeriodStart =
      keep?.currentPeriodStart && baseRemaining > 0 ? new Date(keep.currentPeriodStart) : now;
    const next = {
      planId: plan.id,
      billingCycle: cycle,
      subscriptionType: cycle === 'year' ? 3 : 2,
      periodsPurchased: Math.max(Number(keep?.periodsPurchased) || 0, 0) + addPeriodsCount,
      remainingPeriods: nextRemaining,
      currentPeriodStart,
      price,
      originalPrice,
      discountCode: '',
    };
    if (keep) {
      await M().UserSubscription.updateOne({ _id: keep._id }, next);
      return ok(
        serialize({
          planId: plan.id,
          billingCycle: cycle,
          addPeriods: addPeriodsCount,
          remainingPeriods: nextRemaining,
          endsAt: endsAtFrom(nextRemaining, currentPeriodStart),
        }),
        `${addPeriodsCount} اشتراک (هر کدام ۳۰ روز) اضافه شد`,
      );
    }
    await M().UserSubscription.create({
      _userId: oid(userId),
      ...next,
      startDate: now,
    });
    return ok(
      serialize({
        planId: plan.id,
        billingCycle: cycle,
        addPeriods: addPeriodsCount,
        remainingPeriods: nextRemaining,
        endsAt: endsAtFrom(nextRemaining, currentPeriodStart),
      }),
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
