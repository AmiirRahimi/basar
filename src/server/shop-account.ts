import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { cookies } from 'next/headers';
import { mergePacks, parsePacks } from '@/lib/packs';
import { OTP_TTL_MS, PHONE_RE, SESSION_DAYS, SHOP_COOKIE, SHOP_GUEST_COOKIE } from '@/lib/constants';
import type { CountingAddressOffer, ShopAccountView, ShopOrder, ShopViewer } from '@/lib/shop-account';
import { db, dbEngine, serialize } from './db';
import { fileModels } from './file-db';
import * as mongo from './models';
import { fail, failAuth, failDb, ok, type ActionResult } from './result';
import { clientIp, rateLimit } from './rate-limit';
import { getSession } from './session';

function M() {
  return dbEngine() === 'file' ? fileModels : mongo;
}

function oid(value: unknown) {
  if (value == null || value === '') return undefined;
  const text = String(value);
  return mongoose.Types.ObjectId.isValid(text) ? new mongoose.Types.ObjectId(text) : value;
}

function idOf(value: unknown) {
  if (!value) return '';
  if (typeof value === 'object' && value && '_id' in value) return String((value as { _id?: unknown })._id || '');
  return String(value);
}

function accessSecret() {
  const value = (process.env.JWT_ACCESS_SECRET || '').trim();
  if (value) return value;
  if (process.env.NODE_ENV === 'development') return 'dev-access-secret';
  throw new Error('JWT_ACCESS_SECRET must be set');
}

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
    secure: process.env.NODE_ENV === 'production',
  };
}

function text(value: unknown) {
  return String(value || '').trim();
}

function cityText(value: unknown) {
  const city = text(value);
  if (!city || /^\d+$/.test(city)) return '';
  return city.slice(0, 40);
}

function displayName(user: { shopFullName?: string; fullName?: string } | null | undefined) {
  return text(user?.shopFullName) || text(user?.fullName);
}

type ShopIdentity = { _id: string; phonenumber: string; viaCounting: boolean };

async function identityFromShopCookie(): Promise<ShopIdentity | null> {
  const jar = await cookies();
  const token = jar.get(SHOP_COOKIE)?.value;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, accessSecret(), { algorithms: ['HS256'] }) as jwt.JwtPayload;
    if (payload.sub !== 'shop' || !payload._id || !payload.phonenumber) return null;
    return { _id: String(payload._id), phonenumber: String(payload.phonenumber), viaCounting: false };
  } catch {
    return null;
  }
}

export async function getShopIdentity(): Promise<ShopIdentity | null> {
  await db();
  const shop = await identityFromShopCookie();
  if (shop) return shop;
  const jar = await cookies();
  if (jar.get(SHOP_GUEST_COOKIE)?.value) return null;
  const session = await getSession();
  if (!session?._id || !session.phonenumber) return null;
  return { _id: session._id, phonenumber: session.phonenumber, viaCounting: true };
}

async function userByIdentity(identity: ShopIdentity) {
  const user = await M().User.findById(identity._id).select('-password -refreshToken').lean();
  if (!user) return null;
  if (text((user as { phonenumber?: string }).phonenumber) !== identity.phonenumber) return null;
  return user as Record<string, unknown>;
}

function viewerFromUser(user: Record<string, unknown>): ShopViewer {
  return {
    fullName: displayName(user as { shopFullName?: string; fullName?: string }),
    phonenumber: text(user.phonenumber),
    shopAddress: text(user.shopAddress),
    shopCity: text(user.shopCity) || cityText(user.city),
    postalCode: text(user.postalCode),
  };
}

export async function getShopViewer(): Promise<ShopViewer | null> {
  const identity = await getShopIdentity();
  if (!identity) return null;
  const user = await userByIdentity(identity);
  if (!user) return null;
  return viewerFromUser(user);
}

function cleanLandlines(value: unknown) {
  const list = Array.isArray(value) ? value : [];
  return [...new Set(list.map((item) => text(item)).filter(Boolean))].slice(0, 6);
}

async function countingAddresses(user: Record<string, unknown>): Promise<CountingAddressOffer[]> {
  const offers: CountingAddressOffer[] = [];
  const profileAddress = text(user.address);
  if (profileAddress) {
    offers.push({
      id: 'profile',
      label: 'این آدرس را در اپ شمارش وارد کرده‌اید',
      address: profileAddress,
      city: cityText(user.city),
      landlines: [],
    });
  }
  const userId = idOf(user._id);
  const brands = await M().Brand.find({ _userId: oid(userId), isDeleted: false }).select('_id').lean();
  const brandIds = (brands as { _id: unknown }[]).map((brand) => idOf(brand._id)).filter(Boolean);
  const storeFilter = brandIds.length
    ? { isDeleted: false, $or: [{ _userId: oid(userId) }, { _brandId: { $in: brandIds.map((id) => oid(id)) } }] }
    : { isDeleted: false, _userId: oid(userId) };
  const stores = await M().Store.find(storeFilter).select('_id name address city landlines').lean();
  for (const store of stores as Record<string, unknown>[]) {
    const address = text(store.address);
    if (!address) continue;
    if (offers.some((offer) => offer.address === address)) continue;
    offers.push({
      id: `store:${idOf(store._id)}`,
      label: `این آدرس را برای فروشگاه «${text(store.name) || 'فروشگاه'}» در شمارش ثبت کرده‌اید`,
      address,
      city: cityText(store.city),
      landlines: cleanLandlines(store.landlines),
    });
  }
  const current = text(user.shopAddress);
  return offers.filter((offer) => offer.address !== current);
}

function packsLabel(packs: unknown) {
  return mergePacks(parsePacks(packs))
    .map((pack) => `${pack.count} بسته ${pack.items} تایی`)
    .join('، ');
}

function clothName(cloth: unknown) {
  if (!cloth || typeof cloth !== 'object') return 'لباس';
  const row = cloth as { code?: unknown; _type?: { name?: string }; _style?: { name?: string } };
  const typeName = row._type && typeof row._type === 'object' ? text(row._type.name) : '';
  const styleName = row._style && typeof row._style === 'object' ? text(row._style.name) : '';
  return [typeName, styleName].filter(Boolean).join(' ') || (row.code ? `لباس ${row.code}` : 'لباس');
}

async function ordersForPhone(phone: string): Promise<ShopOrder[]> {
  const people = await M()
    .Person.find({
      isDeleted: false,
      $or: [{ phoneNumber: phone }, { phoneNumber: Number(phone) }],
    })
    .select('_id')
    .lean();
  const personIds = (people as { _id: unknown }[]).map((person) => idOf(person._id)).filter(Boolean);
  if (!personIds.length) return [];
  const invoices = await M()
    .Invoice.find({ isDeleted: false, _client: { $in: personIds.map((id) => oid(id)) } })
    .sort('-timeStamp')
    .limit(40)
    .lean();
  const website = (invoices as Record<string, unknown>[]).filter((invoice) => text(invoice.publicToken)).slice(0, 20);
  if (!website.length) return [];
  const invoiceIds = website.map((invoice) => idOf(invoice._id));
  const lines = await M()
    .CustomerCart.find({ isDeleted: false, _invoice: { $in: invoiceIds.map((id) => oid(id)) } })
    .populate({ path: '_cloth', populate: [{ path: '_type' }, { path: '_style' }] })
    .lean();
  const byInvoice = new Map<string, Record<string, unknown>[]>();
  for (const line of lines as Record<string, unknown>[]) {
    const invoiceId = idOf(line._invoice);
    const bucket = byInvoice.get(invoiceId) || [];
    bucket.push(line);
    byInvoice.set(invoiceId, bucket);
  }
  return website.map((invoice) => {
    const cart = byInvoice.get(idOf(invoice._id)) || [];
    const mapped = cart.map((line) => {
      const count = Number(line.count || 0);
      const price = Number(line.price || 0);
      return {
        name: clothName(line._cloth),
        packsLabel: packsLabel(line.packs),
        count,
        total: count * price,
      };
    });
    return {
      id: idOf(invoice._id),
      invoiceNumber: Number(invoice.invoiceNumber || 0),
      date: invoice.timeStamp ? new Date(String(invoice.timeStamp)).toISOString() : '',
      total: mapped.reduce((sum, line) => sum + line.total, 0),
      sent: Boolean(invoice.isSent),
      paid: Boolean(text(invoice.channel)),
      lines: mapped,
    };
  });
}

export async function getShopAccount(): Promise<ShopAccountView | null> {
  const identity = await getShopIdentity();
  if (!identity) return null;
  const user = await userByIdentity(identity);
  if (!user) return null;
  const orders = await ordersForPhone(text(user.phonenumber));
  return serialize({
    ...viewerFromUser(user),
    email: text(user.email),
    landlines: cleanLandlines(user.landlines),
    viaCounting: identity.viaCounting,
    countingAddresses: await countingAddresses(user),
    orders,
  }) as ShopAccountView;
}

async function findValidOtp(phonenumber: string, code: string) {
  const threshold = new Date(Date.now() - OTP_TTL_MS);
  const rows = await M()
    .OTP.find({ receptor: phonenumber, isUsed: false, timeStamp: { $gt: threshold } })
    .sort({ timeStamp: -1 })
    .limit(5)
    .lean();
  for (const row of rows as { _id: unknown; code?: string }[]) {
    try {
      if (await argon2.verify(String(row.code || ''), code)) return String(row._id);
    } catch {
      /* try the next code */
    }
  }
  return null;
}

async function setShopCookie(userId: string, phonenumber: string) {
  const token = jwt.sign({ sub: 'shop', _id: userId, phonenumber }, accessSecret(), {
    expiresIn: `${SESSION_DAYS}d`,
  });
  const jar = await cookies();
  jar.set(SHOP_COOKIE, token, cookieOptions(SESSION_DAYS * 24 * 60 * 60));
  jar.delete(SHOP_GUEST_COOKIE);
}

export async function loginShopWithOtp(phonenumber: string, code: string): Promise<ActionResult> {
  try {
    await db();
    const phone = text(phonenumber);
    const otp = text(code);
    if (!PHONE_RE.test(phone) || !otp) return fail('شماره و کد الزامی است');
    const ip = await clientIp();
    if (!(await rateLimit(`shop:otp:phone:${phone}`, 8, 10 * 60 * 1000)) || !(await rateLimit(`shop:otp:ip:${ip}`, 20, 10 * 60 * 1000))) {
      return fail('تعداد درخواست‌ها زیاد است. کمی بعد دوباره تلاش کنید', 429);
    }
    const otpId = await findValidOtp(phone, otp);
    if (!otpId) return fail('کد تایید معتبر نیست');
    await M().OTP.updateOne({ _id: otpId }, { isUsed: true });

    let user = await M().User.findOne({ phonenumber: phone });
    const isNew = !user;
    if (!user) user = await M().User.create({ phonenumber: phone });
    const userId = String((user as { _id: unknown })._id);
    await setShopCookie(userId, phone);
    if (isNew) {
      try {
        const { sendWelcomeSms } = await import('./sms');
        await sendWelcomeSms(phone, '');
      } catch {
        /* login still succeeds */
      }
    }
    const row = user as { shopFullName?: string; fullName?: string; shopAddress?: string };
    const complete = Boolean(displayName(row) && text(row.shopAddress));
    return ok({ isNew, complete }, isNew ? 'حساب ساخته شد' : 'ورود موفق');
  } catch {
    return failDb();
  }
}

export async function logoutShop(): Promise<ActionResult> {
  const jar = await cookies();
  jar.delete(SHOP_COOKIE);
  jar.set(SHOP_GUEST_COOKIE, '1', cookieOptions(SESSION_DAYS * 24 * 60 * 60));
  return ok(null, 'از فروشگاه خارج شدید');
}

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validPostal(value: string) {
  return /^[1-9]\d{9}$/.test(value);
}

function validLandline(value: string) {
  return /^0\d{7,10}$/.test(value);
}

async function requireShopUser() {
  const identity = await getShopIdentity();
  if (!identity) return { error: failAuth() };
  const user = await userByIdentity(identity);
  if (!user) return { error: fail('کاربر پیدا نشد', 404) };
  return { identity, user };
}

export async function saveShopProfile(input: {
  fullName?: string;
  email?: string;
  city?: string;
  address?: string;
  postalCode?: string;
  landlines?: string[];
}): Promise<ActionResult> {
  try {
    await db();
    const access = await requireShopUser();
    if ('error' in access) return access.error;
    const fullName = text(input.fullName).slice(0, 80);
    const email = text(input.email).slice(0, 120);
    const city = text(input.city).slice(0, 40);
    const address = text(input.address).slice(0, 500);
    const postalCode = text(input.postalCode);
    const landlines = cleanLandlines(input.landlines);
    if (fullName && fullName.length < 2) return fail('نام را کامل‌تر بنویسید');
    if (email && !validEmail(email)) return fail('ایمیل معتبر نیست');
    if (postalCode && !validPostal(postalCode)) return fail('کد پستی باید ۱۰ رقم باشد');
    if (landlines.some((line) => !validLandline(line))) return fail('تلفن ثابت را با کد شهر بنویسید');
    await M().User.updateOne(
      { _id: access.identity._id },
      {
        shopFullName: fullName,
        email: email || null,
        shopCity: city,
        shopAddress: address,
        postalCode,
        landlines,
      },
    );
    return ok(null, 'اطلاعات حساب ذخیره شد');
  } catch {
    return failDb();
  }
}

export async function acceptCountingAddress(id: string): Promise<ActionResult> {
  try {
    await db();
    const access = await requireShopUser();
    if ('error' in access) return access.error;
    const offers = await countingAddresses(access.user);
    const offer = offers.find((item) => item.id === String(id || ''));
    if (!offer) return fail('این آدرس دیگر در شمارش نیست');
    const currentLines = cleanLandlines(access.user.landlines);
    const landlines = currentLines.length ? currentLines : offer.landlines;
    const city = text(access.user.shopCity) || offer.city || cityText(access.user.city);
    await M().User.updateOne(
      { _id: access.identity._id },
      {
        shopAddress: offer.address,
        shopCity: city,
        landlines,
      },
    );
    return ok(null, 'آدرس شمارش برای تحویل سفارش ثبت شد');
  } catch {
    return failDb();
  }
}
