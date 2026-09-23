import { db, dbEngine, serialize } from './db';
import { fileModels } from './file-db';
import * as mongo from './models';
import { fail, failDb, ok, type ActionResult } from './result';
import { gatewayDriver, requestGatewayPayment, verifyGatewayPayment, type GatewayDriver } from './gateway';
import {
  fulfillStorefrontReservation,
  releaseStorefrontReservation,
  reserveStorefrontCheckout,
} from './domain';
import { buyPlan } from './subscription';
import type { PublicOrderSummary } from '@/lib/types';
import type { ClothPack } from '@/lib/packs';
import type { Session } from './session';

function M() {
  return dbEngine() === 'file' ? fileModels : mongo;
}

const INTENT_TTL_MS = 30 * 60 * 1000;
const CALLBACK_PATH = '/pay/callback';

type StorefrontSnapshot = {
  soldItems: any[];
  customer: { fullName: string; phone: string; address: string };
  shareToken?: string;
  sellerId?: string;
  brandId?: string;
  total: number;
};

type SubscriptionSnapshot = {
  planId: string;
  billingCycle: 'month' | 'year';
  discountCode: string;
  userId: string;
};

type ImageTokenSnapshot = {
  userId: string;
  packId: string;
  tokens: number;
  price: number;
  originalPrice: number;
  discountCode: string;
  discountId: string;
};

async function expireStaleIntents() {
  const now = new Date();
  const stale = await (M().PaymentIntent.find({ status: 'pending', expiresAt: { $lt: now } }) as any).lean();
  for (const row of Array.isArray(stale) ? stale : []) {
    if (row.kind === 'storefront') {
      const snap = row.snapshot as StorefrontSnapshot | undefined;
      if (snap?.soldItems?.length) await releaseStorefrontReservation(snap.soldItems);
    }
    await M().PaymentIntent.updateOne({ _id: row._id }, { status: 'expired' });
  }
}

async function createIntent(input: {
  kind: 'storefront' | 'subscription' | 'image-tokens';
  amount: number;
  snapshot: unknown;
  shareToken?: string;
  userId?: string;
}) {
  return M().PaymentIntent.create({
    kind: input.kind,
    status: 'pending',
    amount: input.amount,
    authority: '',
    driver: gatewayDriver() === 'zarinpal' ? 'zarinpal' : 'mock',
    shareToken: input.shareToken || '',
    snapshot: input.snapshot,
    userId: input.userId || '',
    expiresAt: new Date(Date.now() + INTENT_TTL_MS),
  });
}

export async function startStorefrontPayment(input: {
  fullName: string;
  phone: string;
  address: string;
  items: Array<{ productId: string; packs?: ClothPack[] }>;
  shareToken: string;
}): Promise<ActionResult<{ redirectUrl?: string; invoices?: PublicOrderSummary[] }>> {
  try {
    await db();
    await expireStaleIntents();
    const reserved = await reserveStorefrontCheckout(input);
    if (!reserved.ok || !reserved.data) return reserved;
    const snap = reserved.data as StorefrontSnapshot;
    const amount = Math.max(0, Math.round(Number(snap.total) || 0));
    const intent = await createIntent({
      kind: 'storefront',
      amount,
      snapshot: snap,
      shareToken: snap.shareToken,
    });
    const intentId = String(intent._id);
    if (amount <= 0) {
      const done = await fulfillPaidIntent(intentId, 'free');
      return done;
    }
    const pay = await requestGatewayPayment({
      amountToman: amount,
      description: `سفارش ویترین باسار`,
      callbackPath: CALLBACK_PATH,
      mobile: input.phone,
      orderId: intentId,
    });
    if (!pay.ok) {
      await releaseStorefrontReservation(snap.soldItems);
      await M().PaymentIntent.updateOne({ _id: intentId }, { status: 'failed' });
      return fail(pay.message);
    }
    await M().PaymentIntent.updateOne(
      { _id: intentId },
      { authority: pay.authority, driver: pay.driver },
    );
    if (!pay.redirectUrl) {
      return fulfillPaidIntent(intentId, pay.authority);
    }
    return ok({ redirectUrl: pay.redirectUrl }, 'در حال انتقال به درگاه پرداخت');
  } catch {
    return failDb();
  }
}

export async function startSubscriptionPayment(
  session: Session,
  planId: string,
  cycle: 'month' | 'year',
  discountCode = '',
): Promise<ActionResult<{ redirectUrl?: string }>> {
  try {
    await db();
    const preview = await (await import('./subscription')).previewPlanDiscount(session, planId, cycle, discountCode);
    if (!preview.ok || !preview.data) return preview;
    const amount = Math.max(0, Math.round(Number((preview.data as { price?: number }).price) || 0));
    const intent = await createIntent({
      kind: 'subscription',
      amount,
      userId: session._id,
      snapshot: { planId, billingCycle: cycle, discountCode, userId: session._id } satisfies SubscriptionSnapshot,
    });
    const intentId = String(intent._id);
    if (amount <= 0) {
      const done = await fulfillPaidIntent(intentId, 'free');
      return done.ok ? ok({ redirectUrl: '/counting/profile?tab=subscription&paid=1' }, done.message) : done;
    }
    const pay = await requestGatewayPayment({
      amountToman: amount,
      description: `اشتراک باسار`,
      callbackPath: CALLBACK_PATH,
      mobile: session.phonenumber,
      orderId: intentId,
    });
    if (!pay.ok) {
      await M().PaymentIntent.updateOne({ _id: intentId }, { status: 'failed' });
      return fail(pay.message);
    }
    await M().PaymentIntent.updateOne(
      { _id: intentId },
      { authority: pay.authority, driver: pay.driver },
    );
    if (!pay.redirectUrl) {
      const done = await fulfillPaidIntent(intentId, pay.authority);
      return done.ok ? ok({ redirectUrl: '/counting/profile?tab=subscription&paid=1' }, done.message) : done;
    }
    return ok({ redirectUrl: pay.redirectUrl }, 'در حال انتقال به درگاه پرداخت');
  } catch {
    return failDb();
  }
}

async function fulfillPaidIntent(intentId: string, refId: string): Promise<ActionResult<{ invoices?: PublicOrderSummary[]; redirectUrl?: string }>> {
  const row = await (M().PaymentIntent.findById(intentId) as any).lean();
  if (!row) return fail('پرداخت پیدا نشد', 404);
  if (row.status === 'paid') {
    const invoices = ((row.snapshot as { invoices?: PublicOrderSummary[] }) || {}).invoices || [];
    return ok(
      {
        invoices,
        redirectUrl:
          row.kind === 'subscription'
            ? '/counting/profile?tab=subscription&paid=1'
            : row.kind === 'image-tokens'
              ? '/counting/images?paid=1'
              : undefined,
      },
      'پرداخت قبلاً ثبت شده',
    );
  }
  if (row.status !== 'pending') return fail('این پرداخت دیگر قابل تکمیل نیست');
  if (new Date(row.expiresAt).getTime() < Date.now()) {
    if (row.kind === 'storefront') {
      const snap = row.snapshot as StorefrontSnapshot;
      if (snap?.soldItems?.length) await releaseStorefrontReservation(snap.soldItems);
    }
    await M().PaymentIntent.updateOne({ _id: intentId }, { status: 'expired' });
    return fail('مهلت پرداخت تمام شد. دوباره سفارش دهید.');
  }

  if (row.kind === 'storefront') {
    const snap = row.snapshot as StorefrontSnapshot;
    const fulfilled = await fulfillStorefrontReservation({
      ...snap,
      paymentRef: refId,
    });
    if (!fulfilled.ok || !fulfilled.data) {
      await M().PaymentIntent.updateOne({ _id: intentId }, { status: 'failed' });
      return fulfilled;
    }
    const invoices = (fulfilled.data as { invoices?: PublicOrderSummary[] }).invoices || [];
    await M().PaymentIntent.updateOne(
      { _id: intentId },
      { status: 'paid', refId, paidAt: new Date(), snapshot: { ...snap, invoices } },
    );
    return ok({ invoices }, fulfilled.message || 'پرداخت انجام شد');
  }

  if (row.kind === 'image-tokens') {
    const snap = row.snapshot as ImageTokenSnapshot;
    const { grantImageTokens } = await import('./image-ai');
    const granted = await grantImageTokens(snap);
    if (!granted.ok) {
      await M().PaymentIntent.updateOne({ _id: intentId }, { status: 'failed' });
      return granted;
    }
    await M().PaymentIntent.updateOne({ _id: intentId }, { status: 'paid', refId, paidAt: new Date() });
    return ok({ redirectUrl: '/counting/images?paid=1' }, granted.message || 'توکن به حساب اضافه شد');
  }

  const sub = row.snapshot as SubscriptionSnapshot;
  const { getSession } = await import('./session');
  const session = await getSession();
  const userId = String(sub.userId || row.userId || session?._id || '');
  if (!userId) {
    await M().PaymentIntent.updateOne({ _id: intentId }, { status: 'failed' });
    return fail('نشست کاربر برای فعال‌سازی اشتراک پیدا نشد. دوباره وارد شوید.');
  }
  const fakeSession: Session = session && session._id === userId
    ? session
    : { _id: userId, phonenumber: session?.phonenumber || '', _storeId: session?._storeId || '', _brandId: session?._brandId || '', storeRole: session?.storeRole || 'owner' };
  const bought = await buyPlan(fakeSession, sub.planId, sub.billingCycle, sub.discountCode || '');
  if (!bought.ok) {
    await M().PaymentIntent.updateOne({ _id: intentId }, { status: 'failed' });
    return bought;
  }
  await M().PaymentIntent.updateOne({ _id: intentId }, { status: 'paid', refId, paidAt: new Date() });
  return ok({ redirectUrl: '/counting/profile?tab=subscription&paid=1' }, bought.message || 'اشتراک فعال شد');
}

export async function completeGatewayPayment(input: {
  authority?: string;
  status?: string;
}): Promise<ActionResult<{ invoices?: PublicOrderSummary[]; redirectUrl?: string; kind?: string }>> {
  try {
    await db();
    const authority = String(input.authority || '').trim();
    const status = String(input.status || '').trim().toUpperCase();
    if (!authority) return fail('شناسه پرداخت نامعتبر است');
    const row = await (M().PaymentIntent.findOne({ authority }) as any).lean();
    if (!row) return fail('پرداخت پیدا نشد', 404);
    if (status && status !== 'OK' && !authority.startsWith('free_')) {
      if (row.kind === 'storefront' && row.status === 'pending') {
        const snap = row.snapshot as StorefrontSnapshot;
        if (snap?.soldItems?.length) await releaseStorefrontReservation(snap.soldItems);
      }
      if (row.status === 'pending') await M().PaymentIntent.updateOne({ _id: row._id }, { status: 'failed' });
      return fail('پرداخت لغو شد یا ناموفق بود');
    }
    const driver = String(row.driver || '').trim();
    const driverOk = driver === 'zarinpal' || (process.env.NODE_ENV !== 'production' && driver === 'mock');
    if (!driverOk) {
      if (row.kind === 'storefront' && row.status === 'pending') {
        const snap = row.snapshot as StorefrontSnapshot;
        if (snap?.soldItems?.length) await releaseStorefrontReservation(snap.soldItems);
      }
      if (row.status === 'pending') await M().PaymentIntent.updateOne({ _id: row._id }, { status: 'failed' });
      return fail('تایید پرداخت نامعتبر است');
    }
    const verified = await verifyGatewayPayment({
      authority,
      amountToman: Number(row.amount || 0),
      driver: driver as GatewayDriver,
    });
    if (!verified.ok) {
      if (row.kind === 'storefront' && row.status === 'pending') {
        const snap = row.snapshot as StorefrontSnapshot;
        if (snap?.soldItems?.length) await releaseStorefrontReservation(snap.soldItems);
      }
      if (row.status === 'pending') await M().PaymentIntent.updateOne({ _id: row._id }, { status: 'failed' });
      return fail(verified.message);
    }
    const done = await fulfillPaidIntent(String(row._id), verified.refId);
    if (!done.ok) return done;
    return ok({ ...(done.data || {}), kind: row.kind }, done.message);
  } catch {
    return failDb();
  }
}

export async function completeMockPayment(authority: string, success: boolean) {
  return completeGatewayPayment({
    authority,
    status: success ? 'OK' : 'NOK',
  });
}

export async function startImageTokenPayment(input: ImageTokenSnapshot & { mobile?: string }): Promise<
  ActionResult<{ redirectUrl?: string }>
> {
  try {
    await db();
    const amount = Math.max(0, Math.round(Number(input.price) || 0));
    const intent = await createIntent({
      kind: 'image-tokens',
      amount,
      userId: input.userId,
      snapshot: {
        userId: input.userId,
        packId: input.packId,
        tokens: input.tokens,
        price: amount,
        originalPrice: input.originalPrice,
        discountCode: input.discountCode,
        discountId: input.discountId,
      } satisfies ImageTokenSnapshot,
    });
    const intentId = String(intent._id);
    if (amount <= 0) return fulfillPaidIntent(intentId, 'free');
    const pay = await requestGatewayPayment({
      amountToman: amount,
      description: 'بسته توکن تصویر باسار',
      callbackPath: CALLBACK_PATH,
      mobile: input.mobile,
      orderId: intentId,
    });
    if (!pay.ok) {
      await M().PaymentIntent.updateOne({ _id: intentId }, { status: 'failed' });
      return fail(pay.message);
    }
    await M().PaymentIntent.updateOne({ _id: intentId }, { authority: pay.authority, driver: pay.driver });
    if (!pay.redirectUrl) return fulfillPaidIntent(intentId, pay.authority);
    return ok({ redirectUrl: pay.redirectUrl }, 'در حال انتقال به درگاه پرداخت');
  } catch {
    return failDb();
  }
}

export async function getMockPayment(authority: string) {
  if (process.env.NODE_ENV === 'production') return fail('پرداخت پیدا نشد', 404);
  await db();
  const row = await (M().PaymentIntent.findOne({ authority: String(authority || '').trim() }) as any).lean();
  if (!row) return fail('پرداخت پیدا نشد', 404);
  return ok(
    serialize({
      authority: row.authority,
      amount: row.amount,
      kind: row.kind,
      status: row.status,
    }),
  );
}
