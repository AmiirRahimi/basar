import { PHONE_RE } from '@/lib/constants';
import { PERSIAN_MONTHS, persianYearMonth } from '@/lib/checks';
import { db, dbEngine, serialize } from './db';
import { fileModels } from './file-db';
import * as mongo from './models';
import mongoose from 'mongoose';
import { fail, ok, type ActionResult } from './result';
import { adminSetSubscription, snapshotFromRow } from './subscription';
import { normalizeAdminPermissions, resolveAdminPermissions, type AdminPermissionId } from '@/lib/admin-permissions';
import { isSuperuserPhone } from './teams';
import { requireSession, type Session } from './session';

function M() {
  return dbEngine() === 'file' ? fileModels : mongo;
}

function normalizeCode(value: unknown) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
}

function parseUserIds(value: unknown) {
  const list = Array.isArray(value) ? value : value ? [value] : [];
  return [...new Set(list.map((item) => String(item || '').trim()).filter(Boolean))];
}

function monthsBetween(start?: string | Date, end?: string | Date) {
  const from = start ? new Date(start).getTime() : NaN;
  const to = end ? new Date(end).getTime() : NaN;
  if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) return 0;
  return (to - from) / (1000 * 60 * 60 * 24 * 30);
}

export async function requirePlatformAdmin(
  permission?: AdminPermissionId | AdminPermissionId[],
): Promise<{ session: Session; superuser: boolean; permissions: string[] } | { error: ActionResult }> {
  const auth = await requireSession();
  if ('error' in auth) return { error: auth.error };
  await db();
  const user = await M().User.findById(auth.session._id).select('phonenumber adminPermissions').lean();
  if (!user) return { error: fail('وارد شوید', 401) };
  const superuser = isSuperuserPhone(String(user.phonenumber || auth.session.phonenumber));
  const permissions = resolveAdminPermissions(superuser, (user as { adminPermissions?: unknown }).adminPermissions);
  const need = permission == null ? [] : Array.isArray(permission) ? permission : [permission];
  if (!superuser && (!need.length || !need.some((id) => permissions.includes(id)))) {
    return { error: fail('به این بخش از پنل ادمین دسترسی ندارید', 403) };
  }
  return { session: auth.session, superuser, permissions };
}

function registeredAt(user: { _id?: unknown; timeStamp?: unknown }) {
  if (user.timeStamp) return user.timeStamp;
  try {
    return new mongoose.Types.ObjectId(String(user._id)).getTimestamp();
  } catch {
    return '';
  }
}

function shiftPersianMonth(key: string, delta: number) {
  const [yearRaw, monthRaw] = key.split('/');
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  if (!year || !month) return '';
  const idx = year * 12 + (month - 1) + delta;
  const nextYear = Math.floor(idx / 12);
  const nextMonth = (idx % 12) + 1;
  return `${nextYear}/${String(nextMonth).padStart(2, '0')}`;
}

export async function getAdminOverview(): Promise<ActionResult> {
  const access = await requirePlatformAdmin(['dashboard', 'users']);
  if ('error' in access) return access.error;
  await db();
  const [users, subscriptions, codes, conversations] = await Promise.all([
    M().User.find().lean(),
    M().UserSubscription.find().sort({ startDate: -1 }).lean(),
    M().DiscountCode.find().sort({ timeStamp: -1 }).lean(),
    M().Conversation.find({ status: { $ne: 'closed' } }).select('unreadForAdmin').lean(),
  ]);
  const unansweredMessages = (conversations as any[]).reduce(
    (sum, row) => sum + Number(row.unreadForAdmin || 0),
    0,
  );
  const waitingConversations = (conversations as any[]).filter((row) => Number(row.unreadForAdmin || 0) > 0).length;
  const byUser = new Map<string, any[]>();
  for (const row of subscriptions) {
    const id = String(row._userId || '');
    const list = byUser.get(id) || [];
    list.push(row);
    byUser.set(id, list);
  }
  const userRows = users.map((user: any) => {
    const id = String(user._id);
    const rows = byUser.get(id) || [];
    const snaps = rows.map((row) => snapshotFromRow(row));
    const active = snaps.find((row) => row.active);
    const totalMonths = rows.reduce((sum: number, row: any) => sum + monthsBetween(row.startDate, row.endDate), 0);
    return {
      _id: id,
      fullName: user.fullName || '',
      phonenumber: String(user.phonenumber || ''),
      email: user.email || '',
      city: user.city || '',
      address: user.address || '',
      loggedIn: Boolean(user.refreshToken),
      purchaseCount: rows.length,
      totalMonths: Math.round(totalMonths * 10) / 10,
      active: Boolean(active),
      remainingDays: active?.remainingDays || 0,
      planId: active?.planId || '',
      planName: active?.planName || '',
      billingCycle: active?.billingCycle || '',
      endDate: active?.endDate || '',
      registeredAt: registeredAt(user),
      sheba: user.sheba || '',
      bankName: user.bankName || '',
      imageTokens: Number(user.imageTokens || 0),
    };
  });
  const purchases = subscriptions.map((row: any) => {
    const snap = snapshotFromRow(row);
    const user = users.find((item: any) => String(item._id) === String(row._userId));
    return {
      _id: String(row._id),
      userId: String(row._userId || ''),
      fullName: user?.fullName || '',
      phonenumber: user?.phonenumber || '',
      planName: snap.planName,
      billingCycle: snap.billingCycle,
      price: Number(row.price || 0),
      originalPrice: Number(row.originalPrice || row.price || 0),
      discountCode: row.discountCode || '',
      startDate: row.startDate,
      endDate: row.endDate,
      active: snap.active,
    };
  });
  const nowKey = persianYearMonth(new Date());
  const lastKey = shiftPersianMonth(nowKey, -1);
  const yearKey = nowKey.slice(0, 4);
  const monthlyPurchases = PERSIAN_MONTHS.map((label) => ({ label, amount: 0, count: 0 }));
  for (const row of purchases) {
    const key = persianYearMonth(row.startDate);
    const [year, month] = key.split('/');
    if (year !== yearKey) continue;
    const index = Number(month) - 1;
    if (index < 0 || index > 11) continue;
    monthlyPurchases[index].amount += Number(row.price || 0);
    monthlyPurchases[index].count += 1;
  }
  const thisMonthPurchases = purchases.filter((row) => persianYearMonth(row.startDate) === nowKey);
  const lastMonthPurchases = purchases.filter((row) => persianYearMonth(row.startDate) === lastKey);
  const thisMonthUsers = userRows.filter((row) => persianYearMonth(row.registeredAt) === nowKey);
  const lastMonthUsers = userRows.filter((row) => persianYearMonth(row.registeredAt) === lastKey);
  return ok(
    serialize({
      users: userRows,
      purchases,
      monthlyPurchases,
      codes: codes.map((row: any) => {
        const userIds = parseUserIds(row._userIds);
        return {
          _id: String(row._id),
          code: row.code,
          percent: Number(row.percent || 0),
          maxUses: Number(row.maxUses || 0),
          usedCount: Number(row.usedCount || 0),
          expiresAt: row.expiresAt || '',
          active: row.active !== false,
          note: row.note || '',
          userIds,
          users: userIds.map((id) => {
            const user = users.find((item: any) => String(item._id) === id);
            return user
              ? { _id: id, fullName: user.fullName || '', phonenumber: String(user.phonenumber || '') }
              : { _id: id, fullName: '', phonenumber: '' };
          }),
        };
      }),
      stats: {
        users: userRows.length,
        loggedIn: userRows.filter((row) => row.loggedIn).length,
        active: userRows.filter((row) => row.active).length,
        purchases: purchases.length,
        newUsersThisMonth: thisMonthUsers.length,
        newUsersLastMonth: lastMonthUsers.length,
        purchasesThisMonth: thisMonthPurchases.length,
        purchasesThisMonthAmount: thisMonthPurchases.reduce((sum, row) => sum + Number(row.price || 0), 0),
        purchasesLastMonth: lastMonthPurchases.length,
        purchasesLastMonthAmount: lastMonthPurchases.reduce((sum, row) => sum + Number(row.price || 0), 0),
        unansweredMessages,
        waitingConversations,
      },
    }),
  );
}

export async function createDiscountCode(payload: Record<string, unknown>): Promise<ActionResult> {
  const access = await requirePlatformAdmin('users');
  if ('error' in access) return access.error;
  await db();
  const code = normalizeCode(payload.code);
  const percent = Number(payload.percent || 0);
  if (!code) return fail('کد تخفیف لازم است');
  if (percent <= 0 || percent > 100) return fail('درصد تخفیف باید بین ۱ و ۱۰۰ باشد');
  const exists = await M().DiscountCode.findOne({ code }).lean();
  if (exists) return fail('این کد قبلاً ثبت شده');
  const created = await M().DiscountCode.create({
    code,
    percent,
    maxUses: Math.max(0, Number(payload.maxUses || 0)),
    usedCount: 0,
    expiresAt: payload.expiresAt ? new Date(String(payload.expiresAt)) : null,
    active: payload.active === false ? false : true,
    note: String(payload.note || '').trim(),
    _userIds: parseUserIds(payload._userIds),
  });
  return ok(serialize(created.toObject ? created.toObject() : created), 'کد تخفیف ثبت شد');
}

export async function updateDiscountCode(id: string, payload: Record<string, unknown>): Promise<ActionResult> {
  const access = await requirePlatformAdmin('users');
  if ('error' in access) return access.error;
  await db();
  const next: Record<string, unknown> = {};
  if (payload.percent != null) {
    const percent = Number(payload.percent);
    if (percent <= 0 || percent > 100) return fail('درصد تخفیف باید بین ۱ و ۱۰۰ باشد');
    next.percent = percent;
  }
  if (payload.maxUses != null) next.maxUses = Math.max(0, Number(payload.maxUses || 0));
  if (payload.active != null) next.active = Boolean(payload.active);
  if (payload.note != null) next.note = String(payload.note || '').trim();
  if (payload.expiresAt !== undefined) next.expiresAt = payload.expiresAt ? new Date(String(payload.expiresAt)) : null;
  if (payload._userIds !== undefined) next._userIds = parseUserIds(payload._userIds);
  const updated = await M().DiscountCode.findByIdAndUpdate(id, next);
  if (!updated) return fail('کد پیدا نشد', 404);
  return ok(null, 'ذخیره شد');
}

export async function deleteDiscountCode(id: string): Promise<ActionResult> {
  const access = await requirePlatformAdmin('users');
  if ('error' in access) return access.error;
  await db();
  await M().DiscountCode.findByIdAndDelete(id);
  return ok(null, 'حذف شد');
}

export async function updateAdminUser(id: string, payload: Record<string, unknown>): Promise<ActionResult> {
  const access = await requirePlatformAdmin('users');
  if ('error' in access) return access.error;
  await db();
  const user = await M().User.findById(id).lean();
  if (!user) return fail('کاربر پیدا نشد', 404);

  const next: Record<string, unknown> = {};
  if (payload.fullName != null) next.fullName = String(payload.fullName).trim();
  if (payload.city != null) next.city = String(payload.city).trim();
  if (payload.address != null) next.address = String(payload.address).trim();
  if (payload.email != null) {
    const email = String(payload.email).trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail('ایمیل معتبر نیست');
    next.email = email;
  }
  if (payload.phonenumber != null) {
    const phonenumber = String(payload.phonenumber).trim();
    if (!PHONE_RE.test(phonenumber)) return fail('شماره موبایل معتبر نیست');
    const taken = await M().User.findOne({ phonenumber }).lean();
    if (taken && String(taken._id) !== String(id)) return fail('این موبایل قبلاً ثبت شده');
    next.phonenumber = phonenumber;
  }
  if (Object.keys(next).length) await M().User.findByIdAndUpdate(id, next);
  return ok(null, Object.keys(next).length ? 'اطلاعات کاربر ذخیره شد' : '');
}

export async function setAdminSubscription(userId: string, payload: Record<string, unknown>): Promise<ActionResult> {
  const access = await requirePlatformAdmin('users');
  if ('error' in access) return access.error;
  return adminSetSubscription(userId, payload);
}

export async function saveAdminUser(id: string, payload: Record<string, unknown>): Promise<ActionResult> {
  const access = await requirePlatformAdmin('users');
  if ('error' in access) return access.error;
  const info = await updateAdminUser(id, payload);
  if (!info.ok) return info;
  const sub = await adminSetSubscription(id, payload);
  if (!sub.ok) return sub;
  const message = [info.message, sub.message].filter(Boolean).join(' · ') || 'ذخیره شد';
  return ok(null, message);
}

export async function consumeDiscountCode(code: string, price: number, userId = '') {
  const normalized = normalizeCode(code);
  if (!normalized) {
    return { ok: true as const, price, originalPrice: price, code: '' };
  }
  const row = await M().DiscountCode.findOne({ code: normalized }).lean();
  if (!row || row.active === false) return { ok: false as const, message: 'کد تخفیف معتبر نیست' };
  if (row.expiresAt && new Date(row.expiresAt).getTime() < Date.now()) {
    return { ok: false as const, message: 'مهلت این کد تمام شده است' };
  }
  const allowed = parseUserIds(row._userIds);
  if (allowed.length && !allowed.includes(String(userId))) {
    return { ok: false as const, message: 'این کد برای حساب شما نیست' };
  }
  const maxUses = Number(row.maxUses || 0);
  const usedCount = Number(row.usedCount || 0);
  if (maxUses > 0 && usedCount >= maxUses) {
    return { ok: false as const, message: 'ظرفیت استفاده از این کد تمام شده است' };
  }
  const percent = Math.min(100, Math.max(0, Number(row.percent || 0)));
  const next = Math.round(price * (1 - percent / 100));
  return { ok: true as const, price: Math.max(0, next), originalPrice: price, code: normalized, id: String(row._id) };
}

/** Atomically record one redemption. Empty id means no code was used. */
export async function commitDiscountUse(id: string) {
  if (!id) return { ok: true as const };
  await db();
  const row = await M().DiscountCode.findById(id).lean();
  if (!row || row.active === false) return { ok: false as const, message: 'کد تخفیف معتبر نیست' };
  const maxUses = Number(row.maxUses || 0);
  const usedCount = Number(row.usedCount || 0);
  if (maxUses > 0 && usedCount >= maxUses) {
    return { ok: false as const, message: 'ظرفیت استفاده از این کد تمام شده است' };
  }
  if (dbEngine() === 'file') {
    await M().DiscountCode.updateOne({ _id: row._id }, { usedCount: usedCount + 1 });
    return { ok: true as const };
  }
  const filter: Record<string, unknown> = { _id: row._id, active: { $ne: false } };
  if (maxUses > 0) filter.usedCount = { $lt: maxUses };
  const res = await M().DiscountCode.updateOne(filter, { $inc: { usedCount: 1 } });
  const matched = Number((res as { matchedCount?: number; modifiedCount?: number })?.matchedCount ?? (res as { modifiedCount?: number })?.modifiedCount ?? 0);
  if (!matched) return { ok: false as const, message: 'ظرفیت استفاده از این کد تمام شده است' };
  return { ok: true as const };
}

function phoneText(value: unknown) {
  return String(value || '')
    .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
    .replace(/\s/g, '')
    .trim();
}

function userIdOf(value: { _id?: unknown }) {
  return String(value._id || '');
}

export async function listAdminPanelAccess(): Promise<ActionResult> {
  const access = await requirePlatformAdmin();
  if ('error' in access) return access.error;
  await db();
  const users = await M().User.find().select('_id fullName phonenumber adminPermissions').lean();
  const accounts: { id: string; fullName: string; phonenumber: string }[] = [];
  const grants: { id: string; fullName: string; phonenumber: string; permissions: string[] }[] = [];
  for (const user of users as { _id?: unknown; fullName?: string; phonenumber?: string; adminPermissions?: unknown }[]) {
    const phonenumber = String(user.phonenumber || '');
    if (!phonenumber || isSuperuserPhone(phonenumber)) continue;
    const row = {
      id: userIdOf(user),
      fullName: String(user.fullName || ''),
      phonenumber,
    };
    accounts.push(row);
    const permissions = normalizeAdminPermissions(user.adminPermissions);
    if (permissions.length) grants.push({ ...row, permissions });
  }
  accounts.sort((a, b) => (a.fullName || a.phonenumber).localeCompare(b.fullName || b.phonenumber, 'fa'));
  grants.sort((a, b) => (a.fullName || a.phonenumber).localeCompare(b.fullName || b.phonenumber, 'fa'));
  return ok(serialize({ accounts, grants }));
}

export async function saveAdminPanelGrant(payload: {
  userId?: string;
  phonenumber?: string;
  permissions?: unknown;
}): Promise<ActionResult> {
  const access = await requirePlatformAdmin();
  if ('error' in access) return access.error;
  await db();
  const permissions = normalizeAdminPermissions(payload.permissions);
  const userId = String(payload.userId || '').trim();
  let user: { _id?: unknown; phonenumber?: string } | null = null;
  if (userId) {
    user = await M().User.findById(userId).select('_id fullName phonenumber').lean();
    if (!user) return fail('کاربر پیدا نشد', 404);
  } else {
    const phonenumber = phoneText(payload.phonenumber);
    if (!PHONE_RE.test(phonenumber)) return fail('شماره موبایل معتبر نیست');
    if (!permissions.length) return fail('حداقل یک بخش از پنل ادمین را انتخاب کنید');
    user = await M().User.findOne({ phonenumber }).select('_id fullName phonenumber').lean();
    if (!user) user = await M().User.create({ phonenumber });
  }
  if (!user) return fail('کاربر پیدا نشد', 404);
  if (isSuperuserPhone(String(user.phonenumber || ''))) return fail('سوپریوزر همه بخش‌های پنل را دارد');
  await M().User.findByIdAndUpdate(userIdOf(user), { adminPermissions: permissions });
  return ok(
    { id: userIdOf(user), permissions },
    permissions.length ? 'دسترسی پنل ادمین ذخیره شد' : 'دسترسی پنل ادمین برداشته شد',
  );
}
