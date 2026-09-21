import mongoose from 'mongoose';
import { canWriteResource } from '@/lib/roles';
import { IMAGE_EDIT_TOKEN_COST, imageEditStyleById, imageTokenPackById, type ImageEditStyleId } from '@/lib/image-tokens';
import { MAX_CLOTH_IMAGES, parseImageList } from '@/lib/shop-cart';
import { db, dbEngine, serialize } from './db';
import { fileModels } from './file-db';
import * as mongo from './models';
import { renderProductEdit } from './image-process';
import { readSourceImage, saveProductImage } from './image-store';
import { clientIp, rateLimit } from './rate-limit';
import { fail, ok, type ActionResult } from './result';
import { denyPlanFeature, subscriptionForSession } from './subscription';
import { withWorkspace, accessibleStores } from './workspace';

function M() {
  return dbEngine() === 'file' ? fileModels : mongo;
}

function oid(value: unknown) {
  if (value == null || value === '') return undefined;
  const s = String(value);
  return mongoose.Types.ObjectId.isValid(s) ? new mongoose.Types.ObjectId(s) : value;
}

async function tokenOwnerId(session: { _id: string; _brandId?: string }, cloth?: { _brandId?: unknown }) {
  const brandId = cloth?._brandId || session._brandId;
  if (!brandId) return session._id;
  const brand = await M().Brand.findById(brandId).lean();
  return brand?._userId ? String(brand._userId) : session._id;
}

export async function listImageStudio(): Promise<ActionResult> {
  const access = await withWorkspace();
  if ('error' in access) return access.error;
  await db();
  const ownerId = await tokenOwnerId(access.session);
  const owner = await M().User.findById(ownerId).lean();
  const purchases = await M()
    .ImageTokenPurchase.find({ _userId: oid(ownerId) })
    .sort({ timeStamp: -1 })
    .limit(20)
    .lean();
  const edits = await M()
    .ImageEdit.find({ _userId: oid(ownerId) })
    .sort({ timeStamp: -1 })
    .limit(24)
    .lean();
  return ok(
    serialize({
      imageTokens: Number(owner?.imageTokens || 0),
      unlimited: Boolean(access.session.isPlatformAdmin),
      canBuy: access.session.storeRole === 'owner' || Boolean(access.session.isPlatformAdmin),
      canEdit: canWriteResource(
        access.session.storeRole,
        'cloth',
        Boolean(access.session.isPlatformAdmin),
        access.session.subscriptionActive !== false,
      ),
      purchases: (purchases as any[]).map((row) => ({
        _id: String(row._id),
        packId: row.packId,
        tokens: Number(row.tokens || 0),
        price: Number(row.price || 0),
        timeStamp: row.timeStamp,
      })),
      edits: (edits as any[]).map((row) => ({
        _id: String(row._id),
        clothId: String(row._clothId || ''),
        styleId: row.styleId,
        sourceUrl: row.sourceUrl,
        resultUrl: row.resultUrl,
        timeStamp: row.timeStamp,
      })),
    }),
  );
}

export async function previewImageTokenDiscount(packId: string, discountCode = ''): Promise<ActionResult> {
  const access = await withWorkspace();
  if ('error' in access) return access.error;
  if (access.session.storeRole !== 'owner' && !access.session.isPlatformAdmin) {
    return fail('فقط صاحب برند می‌تواند توکن بخرد', 403);
  }
  const pack = imageTokenPackById(packId);
  if (!pack) return fail('بسته توکن نامعتبر است');
  await db();
  const { consumeDiscountCode } = await import('./admin');
  const discounted = await consumeDiscountCode(discountCode, pack.price, access.session._id);
  if (!discounted.ok) return fail(discounted.message);
  const percent = pack.price > 0 ? Math.round((1 - discounted.price / pack.price) * 100) : 0;
  return ok({
    packId: pack.id,
    originalPrice: pack.price,
    price: discounted.price,
    code: discounted.code,
    percent,
    tokens: pack.tokens,
  });
}

export async function buyImageTokens(packId: string, discountCode = ''): Promise<ActionResult> {
  const access = await withWorkspace();
  if ('error' in access) return access.error;
  if (access.session.storeRole !== 'owner' && !access.session.isPlatformAdmin) {
    return fail('فقط صاحب برند می‌تواند توکن بخرد', 403);
  }
  const tokenPlan = denyPlanFeature(await subscriptionForSession(access.session), 'cloth-images');
  if (tokenPlan) return tokenPlan;
  const pack = imageTokenPackById(packId);
  if (!pack) return fail('بسته توکن نامعتبر است');
  const ip = await clientIp();
  if (!rateLimit(`image-tokens:buy:${access.session._id}`, 8, 10 * 60 * 1000) || !rateLimit(`image-tokens:buy:ip:${ip}`, 20, 10 * 60 * 1000)) {
    return fail('تعداد خریدها زیاد است. کمی بعد دوباره تلاش کنید', 429);
  }
  await db();
  const { consumeDiscountCode } = await import('./admin');
  const discounted = await consumeDiscountCode(discountCode, pack.price, access.session._id);
  if (!discounted.ok) return fail(discounted.message);
  const ownerId = await tokenOwnerId(access.session);
  const owner = await M().User.findById(ownerId).lean();
  if (!owner) return fail('کاربر پیدا نشد', 404);
  const next = Number(owner.imageTokens || 0) + pack.tokens;
  await M().User.findByIdAndUpdate(ownerId, { imageTokens: next });
  await M().ImageTokenPurchase.create({
    _userId: oid(ownerId),
    packId: pack.id,
    tokens: pack.tokens,
    price: discounted.price,
    originalPrice: pack.price,
    discountCode: discounted.code,
    timeStamp: new Date(),
  });
  if (discounted.id) {
    const row = await M().DiscountCode.findById(discounted.id).lean();
    await M().DiscountCode.updateOne({ _id: oid(discounted.id) }, { usedCount: Number(row?.usedCount || 0) + 1 });
  }
  return ok(serialize({ imageTokens: next, added: pack.tokens, price: discounted.price }), `${pack.tokens} توکن به حساب اضافه شد`);
}

export async function editProductImage(payload: {
  clothId: string;
  imageUrl: string;
  styleId: string;
}): Promise<ActionResult> {
  const access = await withWorkspace();
  if ('error' in access) return access.error;
  const canEdit = canWriteResource(
    access.session.storeRole,
    'cloth',
    Boolean(access.session.isPlatformAdmin),
    access.session.subscriptionActive !== false,
  );
  if (!canEdit) return fail('اجازه ویرایش تصویر این لباس را ندارید', 403);
  const imagePlan = denyPlanFeature(await subscriptionForSession(access.session), 'cloth-images');
  if (imagePlan) return imagePlan;
  const style = imageEditStyleById(payload.styleId);
  if (!style) return fail('جلوه نامعتبر است');
  const ip = await clientIp();
  if (!rateLimit(`image-edit:${access.session._id}`, 12, 10 * 60 * 1000) || !rateLimit(`image-edit:ip:${ip}`, 30, 10 * 60 * 1000)) {
    return fail('تعداد ویرایش‌ها زیاد است. کمی بعد دوباره تلاش کنید', 429);
  }
  await db();
  const cloth = await M().Cloth.findById(payload.clothId).lean();
  if (!cloth || cloth.isDeleted) return fail('لباس پیدا نشد', 404);
  if (!access.session.isPlatformAdmin) {
    const { stores } = await accessibleStores(access.session._id, access.session.phonenumber);
    const allowed = new Set((stores as any[]).map((store) => String(store._id)));
    const storeId = String(cloth._storeId?._id || cloth._storeId || '');
    if (!allowed.has(storeId)) return fail('اجازه ویرایش تصویر این لباس را ندارید', 403);
  }
  const images = parseImageList(cloth.images);
  const sourceUrl = String(payload.imageUrl || '').trim();
  if (!images.includes(sourceUrl)) return fail('این تصویر برای این لباس ثبت نشده');
  const ownerId = await tokenOwnerId(access.session, cloth);
  const owner = await M().User.findById(ownerId).lean();
  if (!owner) return fail('حساب توکن پیدا نشد', 404);
  const balance = Number(owner.imageTokens || 0);
  const spent = IMAGE_EDIT_TOKEN_COST;
  if (!access.session.isPlatformAdmin && balance < spent) {
    return fail('توکن کافی نیست. هر تصویر یک توکن می‌خواهد. ابتدا بسته توکن بخرید.');
  }
  try {
    const source = await readSourceImage(sourceUrl);
    const rendered = await renderProductEdit(source, style.id as ImageEditStyleId);
    const resultUrl = await saveProductImage(rendered, 'jpg');
    const nextImages = images
      .map((item) => (item === sourceUrl ? resultUrl : item))
      .filter((item, index, list) => item && list.indexOf(item) === index)
      .slice(0, MAX_CLOTH_IMAGES);
    await M().Cloth.findByIdAndUpdate(payload.clothId, { images: nextImages });
    if (!access.session.isPlatformAdmin) {
      await M().User.findByIdAndUpdate(ownerId, { imageTokens: Math.max(0, balance - spent) });
    }
    await M().ImageEdit.create({
      _userId: oid(ownerId),
      _clothId: oid(payload.clothId),
      styleId: style.id,
      sourceUrl,
      resultUrl,
      timeStamp: new Date(),
    });
    return ok(
      serialize({
        resultUrl,
        images: nextImages,
        imageTokens: access.session.isPlatformAdmin ? balance : Math.max(0, balance - spent),
        spent,
      }),
      'تصویر محصول آماده شد',
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message && /آدرس|حجم|دانلود|جلوه/.test(message)) return fail(message);
    return fail('ساخت تصویر ناموفق بود');
  }
}
