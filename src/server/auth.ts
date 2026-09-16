import argon2 from 'argon2';
import mongoose from 'mongoose';
import { db, dbEngine, serialize } from './db';
import * as mongo from './models';
import { fileModels } from './file-db';
import { fail, ok, type ActionResult } from './result';
import { clearAuthCookies, setAuthCookies, signTokens, type Session } from './session';

import { PHONE_RE } from '@/lib/constants';
import {
  activateMemberships,
  ensureOwnerWorkspace,
  resolveLoginContext,
} from './workspace';

function M() {
  return dbEngine() === 'file' ? fileModels : mongo;
}

async function remainingDays(userId: string) {
  const sub = await M().UserSubscription.findOne({ _userId: userId, endDate: { $gte: new Date() } }).sort({ endDate: -1 }).lean();
  if (!sub) return 0;
  return Math.max(0, Math.ceil((new Date(sub.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
}

async function ensureSubscription(userId: string) {
  const active = await M().UserSubscription.countDocuments({ _userId: userId, endDate: { $gte: new Date() } });
  if (active) return;
  await M().UserSubscription.create({
    _userId: userId,
    subscriptionType: 1,
    startDate: new Date(),
    endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
  });
}

export async function checkPhone(phonenumber: string): Promise<ActionResult> {
  try {
    await db();
    const user = await M().User.findOne({ phonenumber });
    return ok({ exists: Boolean(user) }, user ? 'کاربر موجود است' : '');
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'اتصال به پایگاه داده برقرار نشد', 500);
  }
}

export async function sendOtp(phonenumber: string): Promise<ActionResult> {
  try {
    await db();
    if (!phonenumber || !PHONE_RE.test(phonenumber)) {
      return fail('شماره موبایل معتبر نیست');
    }
    const code = String(Math.floor(Math.random() * 90000) + 10000);
    if (process.env.NODE_ENV === 'production' && process.env.MELLI_PAYAMAK_TOKEN) {
      try {
        await fetch(`${process.env.MELLI_PAYAMAK_BASE_URL}${process.env.MELLI_PAYAMAK_PATH}${process.env.MELLI_PAYAMAK_TOKEN}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to: phonenumber }),
        });
      } catch {
        await M().OTP.create({ receptor: phonenumber, code, type: 1, isUsed: false });
        return fail('ارسال پیامک ناموفق بود');
      }
    }
    await M().OTP.create({ receptor: phonenumber, code, type: 1, isUsed: false });
    if (process.env.NODE_ENV !== 'production') {
      console.info('[OTP]', phonenumber, code);
      return ok({ devCode: code }, `کد آزمایشی: ${code}`);
    }
    return ok(null, 'کد ارسال شد');
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'اتصال به پایگاه داده برقرار نشد', 500);
  }
}

export async function loginWithOtp(form: {
  phonenumber: string;
  code: string;
  password?: string;
}): Promise<ActionResult> {
  try {
    await db();
  const { phonenumber, code, password } = form;
  if (!phonenumber || !code) return fail('شماره و کد الزامی است');

  const threshold = new Date(Date.now() - 120000);
  const valid = await M().OTP.countDocuments({
    receptor: phonenumber,
    code: String(code),
    isUsed: false,
    timeStamp: { $gt: threshold },
  });
  if (!valid) return fail('کد تایید معتبر نیست');

  if (phonenumber === process.env.ADMIN_PHONENUMBER) {
    if (!password) return fail('رمز ادمین لازم است');
    const hash = process.env.ADMIN_PASSWORD;
    if (!hash || !(await argon2.verify(hash, password))) return fail('رمز نادرست است');
  }

  let user = await M().User.findOne({ phonenumber });
  if (!user) user = await M().User.create({ phonenumber });
  const userId = String(user._id);
  await activateMemberships(userId, phonenumber);
  await ensureOwnerWorkspace(userId, user.fullName, phonenumber);
  const context = await resolveLoginContext(userId, phonenumber);
  if (!context) return fail('فروشگاهی برای ورود پیدا نشد');
  await ensureSubscription(userId);
  const session: Session = {
    _id: userId,
    phonenumber: String(user.phonenumber),
    _storeId: context._storeId,
    _brandId: context._brandId,
    storeRole: context.storeRole,
  };
  const tokens = signTokens(session, code);
  await M().User.updateOne({ _id: String(user._id) }, { refreshToken: tokens.refreshToken });
  await M().OTP.updateOne({ code: String(code), receptor: phonenumber }, { isUsed: true });
  await setAuthCookies(tokens);
  return ok(tokens, 'ورود موفق');
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'اتصال به پایگاه داده برقرار نشد', 500);
  }
}

export async function logout(): Promise<void> {
  try {
    await db();
    const { getSession } = await import('./session');
    const session = await getSession();
    if (session) {
      await M().User.updateOne({ _id: session._id }, { refreshToken: null });
    }
  } catch {
    /* still clear cookies */
  }
  await clearAuthCookies();
}

export async function getSessionUser(): Promise<ActionResult> {
  const { getSession } = await import('./session');
  await db();
  const session = await getSession();
  if (!session) return fail('وارد شوید', 401);
  const user = await M().User.findById(session._id).select('-password -refreshToken').lean();
  if (!user) return fail('کاربر پیدا نشد', 404);
  const days = await remainingDays(session._id);
  return ok(serialize({ ...user, remainingDaysOfSubscription: days, phoneNumber: user.phonenumber }));
}

export async function updateProfile(payload: Record<string, unknown>): Promise<ActionResult> {
  const { requireSession } = await import('./session');
  await db();
  const auth = await requireSession();
  if ('error' in auth) return auth.error;
  const updated = await M().User.findByIdAndUpdate(
    auth.session._id,
    {
      ...(payload.fullName != null ? { fullName: String(payload.fullName).trim() } : {}),
      ...(payload.address != null ? { address: String(payload.address).trim() } : {}),
      ...(payload.city != null ? { city: String(payload.city).trim() } : {}),
    },
    { new: true },
  )
    .select('-password -refreshToken')
    .lean();
  return ok(serialize(updated), 'ذخیره شد');
}

export async function activateSubscription(payload: Record<string, unknown>): Promise<ActionResult> {
  const { requireSession } = await import('./session');
  await db();
  const auth = await requireSession();
  if ('error' in auth) return auth.error;
  const type = Number(payload.subscriptionType || 1);
  const day = 24 * 60 * 60 * 1000;
  let end = Date.now() + 30 * day;
  if (type === 3) end = Date.now() + 12 * 30 * day;
  if (type === 1) {
    const usedFree = await M().UserSubscription.countDocuments({ _userId: auth.session._id, subscriptionType: 1 });
    if (usedFree > 0) return fail('اشتراک رایگان قبلاً استفاده شده');
  }
  await M().UserSubscription.create({
    _userId: new mongoose.Types.ObjectId(auth.session._id),
    subscriptionType: type,
    startDate: new Date(),
    endDate: new Date(end),
  });
  return ok({ remainingDaysOfSubscription: await remainingDays(auth.session._id) }, 'اشتراک فعال شد');
}

export async function listUsers(page = 1, skip = 50): Promise<ActionResult> {
  await db();
  const { requireSession } = await import('./session');
  const auth = await requireSession();
  if ('error' in auth) return auth.error;
  const users = await M().User.find()
    .select('-password -refreshToken')
    .skip((page - 1) * skip)
    .limit(skip)
    .lean();
  return ok(serialize(users));
}
