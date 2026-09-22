import { randomInt } from 'node:crypto';
import argon2 from 'argon2';
import { db, dbEngine, serialize } from './db';
import * as mongo from './models';
import { fileModels } from './file-db';
import { fail, failDb, ok, type ActionResult } from './result';
import { clearAuthCookies, setAuthCookies, signTokens, type Session } from './session';
import { OTP_TTL_MS, PHONE_RE } from '@/lib/constants';
import { publicSmsFailureMessage, sendOtpCode, sendWelcomeSms, smsLive } from './sms';
import {
  activateMemberships,
  ensureOwnerWorkspace,
  resolveLoginContext,
} from './workspace';
import { previewPlanDiscount, remainingDays } from './subscription';
import { startSubscriptionPayment } from './pay';
import { normalizeCardNumber, normalizeSheba, shebaIsValid } from '@/lib/iran-bank';
import { clampPage } from './paging';
import { clientIp, rateLimit } from './rate-limit';

function M() {
  return dbEngine() === 'file' ? fileModels : mongo;
}

function isAdminPhone(phonenumber: string) {
  const admin = (process.env.ADMIN_PHONENUMBER || '').trim();
  return Boolean(admin) && phonenumber === admin;
}

function readAdminPassword() {
  return (process.env.ADMIN_PASSWORD || '')
    .trim()
    .replace(/\r/g, '')
    .replace(/^["']|["']$/g, '')
    .replace(/\\\$/g, '$');
}

function envFlag(name: string) {
  const value = (process.env[name] || '').trim().toLowerCase();
  return value === '1' || value === 'true' || value === 'yes';
}

function revealLoginCode() {
  return envFlag('SHOW_LOGIN_NUMBER');
}

async function adminPasswordMatches(password: string) {
  const stored = readAdminPassword();
  if (!stored) return false;
  if (stored.startsWith('$argon2')) {
    try {
      return await argon2.verify(stored, password);
    } catch {
      return false;
    }
  }
  if (process.env.NODE_ENV === 'production') return false;
  console.warn('[basar] ADMIN_PASSWORD is plaintext; hash it with argon2 before production');
  return stored === password;
}

export async function checkPhone(phonenumber: string): Promise<ActionResult> {
  if (!phonenumber || !PHONE_RE.test(phonenumber)) return fail('شماره موبایل معتبر نیست');
  return ok(null, 'ادامه دهید');
}

export async function sendOtp(phonenumber: string): Promise<ActionResult> {
  try {
    await db();
    if (!phonenumber || !PHONE_RE.test(phonenumber)) {
      return fail('شماره موبایل معتبر نیست');
    }
    const ip = await clientIp();
    if (!rateLimit(`otp:send:phone:${phonenumber}`, 3, 10 * 60 * 1000) || !rateLimit(`otp:send:ip:${ip}`, 10, 10 * 60 * 1000)) {
      return fail('تعداد درخواست‌ها زیاد است. کمی بعد دوباره تلاش کنید', 429);
    }
    const code = String(randomInt(100000, 1000000));
    const hashed = await argon2.hash(code);
    await M().OTP.create({ receptor: phonenumber, code: hashed, type: 1, isUsed: false });
    const sms = await sendOtpCode(phonenumber, code);
    if (!sms.ok) {
      console.error('[OTP SMS]', sms.message);
      if (revealLoginCode()) return ok(null, `کد ورود: ${code}`);
      return fail(publicSmsFailureMessage(sms.message));
    }
    if (!smsLive()) console.info('[OTP]', phonenumber, code);
    if (revealLoginCode()) return ok(null, `کد ورود: ${code}`);
    return ok(null, 'کد ارسال شد');
  } catch {
    return failDb();
  }
}

async function findValidOtp(phonenumber: string, code: string) {
  const threshold = new Date(Date.now() - OTP_TTL_MS);
  const rows = await M()
    .OTP.find({ receptor: phonenumber, isUsed: false, timeStamp: { $gt: threshold } })
    .sort({ timeStamp: -1 })
    .limit(5)
    .lean();
  for (const row of rows) {
    try {
      if (await argon2.verify(String(row.code), code)) return String(row._id);
    } catch {
      /* try next row */
    }
  }
  return null;
}

export async function loginWithOtp(form: {
  phonenumber: string;
  code: string;
  password?: string;
}): Promise<ActionResult> {
  try {
    await db();
    const { phonenumber, code, password } = form;
    if (!phonenumber || !PHONE_RE.test(phonenumber) || !code) return fail('شماره و کد الزامی است');
    const ip = await clientIp();
    if (!rateLimit(`otp:login:phone:${phonenumber}`, 8, 10 * 60 * 1000) || !rateLimit(`otp:login:ip:${ip}`, 20, 10 * 60 * 1000)) {
      return fail('تعداد درخواست‌ها زیاد است. کمی بعد دوباره تلاش کنید', 429);
    }

    const otpId = await findValidOtp(phonenumber, String(code));
    if (!otpId) return fail('کد تایید معتبر نیست');

    if (isAdminPhone(phonenumber)) {
      if (!password) return fail('رمز ادمین لازم است');
      if (!(await adminPasswordMatches(password))) return fail('رمز نادرست است');
    }

    await M().OTP.updateOne({ _id: otpId }, { isUsed: true });

    let user = await M().User.findOne({ phonenumber });
    const isNew = !user;
    if (!user) user = await M().User.create({ phonenumber });
    const userId = String(user._id);
    await activateMemberships(userId, phonenumber);
    await ensureOwnerWorkspace(userId, user.fullName, phonenumber);
    const context = await resolveLoginContext(userId, phonenumber);
    if (!context) return fail('فروشگاهی برای ورود پیدا نشد');
    const session: Session = {
      _id: userId,
      phonenumber: String(user.phonenumber),
      _storeId: context._storeId,
      _brandId: context._brandId,
      storeRole: context.storeRole,
    };
    const tokens = signTokens(session);
    await M().User.updateOne({ _id: String(user._id) }, { refreshToken: tokens.refreshToken });
    await setAuthCookies(tokens);
    if (isNew) {
      try {
        await sendWelcomeSms(phonenumber, String(user.fullName || ''));
      } catch {
        /* never block signup */
      }
    }
    return ok(null, 'ورود موفق');
  } catch {
    return failDb();
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
  if (payload.sheba != null) {
    const sheba = normalizeSheba(payload.sheba);
    if (sheba && !shebaIsValid(sheba)) return fail('شماره شبا باید با IR و ۲۴ رقم باشد');
  }
  const updated = await M().User.findByIdAndUpdate(
    auth.session._id,
    {
      ...(payload.fullName != null ? { fullName: String(payload.fullName).trim() } : {}),
      ...(payload.address != null ? { address: String(payload.address).trim() } : {}),
      ...(payload.city != null ? { city: String(payload.city).trim() } : {}),
      ...(payload.bankName != null ? { bankName: String(payload.bankName).trim() } : {}),
      ...(payload.sheba != null ? { sheba: normalizeSheba(payload.sheba) } : {}),
      ...(payload.cardNumber != null ? { cardNumber: normalizeCardNumber(payload.cardNumber) } : {}),
    },
    { new: true },
  )
    .select('-password -refreshToken')
    .lean();
  return ok(serialize(updated), 'ذخیره شد');
}

export async function activateSubscription(payload: Record<string, unknown>): Promise<ActionResult> {
  const { withWorkspace } = await import('./workspace');
  const access = await withWorkspace();
  if ('error' in access) return access.error || fail('وارد شوید', 401);
  const planId = String(payload.planId || 'starter');
  const cycle = payload.billingCycle === 'year' ? 'year' : 'month';
  return startSubscriptionPayment(access.session, planId, cycle, String(payload.discountCode || ''));
}

export async function previewSubscriptionDiscount(payload: Record<string, unknown>): Promise<ActionResult> {
  const { withWorkspace } = await import('./workspace');
  const access = await withWorkspace();
  if ('error' in access) return access.error || fail('وارد شوید', 401);
  const planId = String(payload.planId || 'starter');
  const cycle = payload.billingCycle === 'year' ? 'year' : 'month';
  return previewPlanDiscount(access.session, planId, cycle, String(payload.discountCode || ''));
}

export async function listUsers(page = 1, skip = 50): Promise<ActionResult> {
  const { requirePlatformAdmin } = await import('./admin');
  const access = await requirePlatformAdmin();
  if ('error' in access) return access.error;
  await db();
  const paging = clampPage(page, skip);
  const users = await M().User.find()
    .select('-password -refreshToken')
    .skip((paging.page - 1) * paging.skip)
    .limit(paging.skip)
    .lean();
  return ok(serialize(users));
}
