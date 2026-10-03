import mongoose from 'mongoose';
import { canWriteResource } from '@/lib/roles';
import {
  IMAGE_EDIT_TOKEN_COST,
  imageEditStyleById,
  imageTokenPackId,
  imageTokenPrice,
  normalizeImageTokenAmount,
  type ImageEditStyleId,
} from '@/lib/image-tokens';
import {
  addGeneratedToLibrary,
  libraryHasUrl,
  normalizeClothImageLibrary,
  shownUrlsFromLibrary,
} from '@/lib/cloth-images';
import { MAX_VIRTUAL_MODEL_IMAGES } from '@/lib/photoroom';
import { db, dbEngine, serialize } from './db';
import { fileModels } from './file-db';
import * as mongo from './models';
import { renderProductEdit } from './image-process';
import { photoroomApiKey, photoroomVirtualModel } from './photoroom';
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
      photoroomReady: Boolean(photoroomApiKey()),
      canBuy: access.session.storeRole === 'owner' || Boolean(access.session.isPlatformAdmin),
      canEdit: canWriteResource(
        access.session.storeRole,
        'cloth',
        Boolean(access.session.isPlatformAdmin),
        access.session.subscriptionActive !== false,
        access.session.permissions,
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

export async function previewImageTokenDiscount(tokens: number, discountCode = ''): Promise<ActionResult> {
  const access = await withWorkspace();
  if ('error' in access) return access.error;
  if (access.session.storeRole !== 'owner' && !access.session.isPlatformAdmin) {
    return fail('فقط صاحب برند می‌تواند توکن بخرد', 403);
  }
  const amount = normalizeImageTokenAmount(tokens);
  if (!amount) return fail('تعداد توکن نامعتبر است');
  const originalPrice = imageTokenPrice(amount);
  await db();
  const { consumeDiscountCode } = await import('./admin');
  const discounted = await consumeDiscountCode(discountCode, originalPrice, access.session._id);
  if (!discounted.ok) return fail(discounted.message);
  const percent = originalPrice > 0 ? Math.round((1 - discounted.price / originalPrice) * 100) : 0;
  return ok({
    packId: imageTokenPackId(amount),
    originalPrice,
    price: discounted.price,
    code: discounted.code,
    percent,
    tokens: amount,
  });
}

export async function grantImageTokens(input: {
  userId: string;
  packId: string;
  tokens: number;
  price: number;
  originalPrice: number;
  discountCode: string;
  discountId: string;
}): Promise<ActionResult> {
  await db();
  const { commitDiscountUse } = await import('./admin');
  const committed = await commitDiscountUse(input.discountId);
  if (!committed.ok) return fail(committed.message);
  const owner = await M().User.findById(input.userId).lean();
  if (!owner) return fail('کاربر پیدا نشد', 404);
  const next = Number(owner.imageTokens || 0) + Number(input.tokens || 0);
  await M().User.findByIdAndUpdate(input.userId, { imageTokens: next });
  await M().ImageTokenPurchase.create({
    _userId: oid(input.userId),
    packId: input.packId,
    tokens: input.tokens,
    price: input.price,
    originalPrice: input.originalPrice,
    discountCode: input.discountCode,
    timeStamp: new Date(),
  });
  return ok(serialize({ imageTokens: next, added: input.tokens, price: input.price }), `${input.tokens} توکن به حساب اضافه شد`);
}

export async function buyImageTokens(tokens: number, discountCode = ''): Promise<ActionResult> {
  const access = await withWorkspace();
  if ('error' in access) return access.error;
  if (access.session.storeRole !== 'owner' && !access.session.isPlatformAdmin) {
    return fail('فقط صاحب برند می‌تواند توکن بخرد', 403);
  }
  const tokenPlan = denyPlanFeature(await subscriptionForSession(access.session), 'cloth-images');
  if (tokenPlan) return tokenPlan;
  const amount = normalizeImageTokenAmount(tokens);
  if (!amount) return fail('تعداد توکن نامعتبر است');
  const originalPrice = imageTokenPrice(amount);
  const ip = await clientIp();
  if (
    !(await rateLimit(`image-tokens:buy:${access.session._id}`, 8, 10 * 60 * 1000)) ||
    !(await rateLimit(`image-tokens:buy:ip:${ip}`, 20, 10 * 60 * 1000))
  ) {
    return fail('تعداد خریدها زیاد است. کمی بعد دوباره تلاش کنید', 429);
  }
  await db();
  const { consumeDiscountCode } = await import('./admin');
  const discounted = await consumeDiscountCode(discountCode, originalPrice, access.session._id);
  if (!discounted.ok) return fail(discounted.message);
  const ownerId = await tokenOwnerId(access.session);
  const { startImageTokenPayment } = await import('./pay');
  return startImageTokenPayment({
    userId: ownerId,
    packId: imageTokenPackId(amount),
    tokens: amount,
    price: discounted.price,
    originalPrice,
    discountCode: discounted.code,
    discountId: discounted.id || '',
    mobile: access.session.phonenumber,
  });
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
    access.session.permissions,
  );
  if (!canEdit) return fail('اجازه ویرایش تصویر این لباس را ندارید', 403);
  const imagePlan = denyPlanFeature(await subscriptionForSession(access.session), 'cloth-images');
  if (imagePlan) return imagePlan;
  const style = imageEditStyleById(payload.styleId);
  if (!style) return fail('جلوه نامعتبر است');
  const ip = await clientIp();
  if (!(await rateLimit(`image-edit:${access.session._id}`, 12, 10 * 60 * 1000)) || !(await rateLimit(`image-edit:ip:${ip}`, 30, 10 * 60 * 1000))) {
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
  const library = normalizeClothImageLibrary(cloth.imageLibrary, cloth.images);
  const sourceUrl = String(payload.imageUrl || '').trim();
  if (!libraryHasUrl(library, sourceUrl)) return fail('این تصویر برای این لباس ثبت نشده');
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
    const nextLibrary = addGeneratedToLibrary(library, sourceUrl, resultUrl, style.id);
    const nextImages = shownUrlsFromLibrary(nextLibrary);
    await M().Cloth.findByIdAndUpdate(payload.clothId, {
      images: nextImages,
      imageLibrary: nextLibrary,
    });
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
        imageLibrary: nextLibrary,
        imageTokens: access.session.isPlatformAdmin ? balance : Math.max(0, balance - spent),
        spent,
      }),
      'نسخه هوش مصنوعی ساخته شد',
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message && /آدرس|حجم|دانلود|جلوه|Photoroom|کلید/.test(message)) return fail(message);
    return fail('ساخت تصویر ناموفق بود');
  }
}

export async function generateClothOnModel(payload: {
  clothId?: string;
  imageUrls: string[];
  model?: string;
  scene?: string;
  pose?: string;
  prompt?: string;
}): Promise<ActionResult> {
  const access = await withWorkspace();
  if ('error' in access) return access.error;
  const canEdit = canWriteResource(
    access.session.storeRole,
    'cloth',
    Boolean(access.session.isPlatformAdmin),
    access.session.subscriptionActive !== false,
    access.session.permissions,
  );
  if (!canEdit) return fail('اجازه ساخت تصویر این لباس را ندارید', 403);
  const imagePlan = denyPlanFeature(await subscriptionForSession(access.session), 'cloth-images');
  if (imagePlan) return imagePlan;
  if (!photoroomApiKey()) return fail('کلید Photoroom تنظیم نشده است');
  const clothId = String(payload.clothId || '').trim();
  if (!clothId) return fail('لباس را انتخاب کنید');
  const urls = [...new Set((payload.imageUrls || []).map((item) => String(item || '').trim()).filter(Boolean))];
  if (!urls.length) return fail('حداقل یک تصویر انتخاب کنید');
  if (urls.length > MAX_VIRTUAL_MODEL_IMAGES) return fail(`حداکثر ${MAX_VIRTUAL_MODEL_IMAGES} زاویه برای هر ساخت مجاز است`);
  const ip = await clientIp();
  if (!(await rateLimit(`image-model:${access.session._id}`, 8, 10 * 60 * 1000)) || !(await rateLimit(`image-model:ip:${ip}`, 20, 10 * 60 * 1000))) {
    return fail('تعداد ساخت مدل زیاد است. کمی بعد دوباره تلاش کنید', 429);
  }

  await db();
  const cloth = await M().Cloth.findById(clothId).lean();
  if (!cloth || cloth.isDeleted) return fail('لباس پیدا نشد', 404);
  if (!access.session.isPlatformAdmin) {
    const { stores } = await accessibleStores(access.session._id, access.session.phonenumber);
    const allowed = new Set((stores as any[]).map((store) => String(store._id)));
    const storeId = String(cloth._storeId?._id || cloth._storeId || '');
    if (!allowed.has(storeId)) return fail('اجازه ویرایش تصویر این لباس را ندارید', 403);
  }
  const library = normalizeClothImageLibrary(cloth.imageLibrary, cloth.images);
  if (urls.some((url) => !libraryHasUrl(library, url))) {
    return fail('یکی از تصاویر انتخاب‌شده برای این لباس ثبت نشده');
  }

  const ownerId = await tokenOwnerId(access.session, cloth);
  const owner = await M().User.findById(ownerId).lean();
  if (!owner) return fail('حساب توکن پیدا نشد', 404);
  const balance = Number(owner.imageTokens || 0);
  const spent = IMAGE_EDIT_TOKEN_COST;
  if (!access.session.isPlatformAdmin && balance < spent) {
    return fail('توکن کافی نیست. هر ساخت مدل یک توکن می‌خواهد.');
  }

  try {
    const buffers = await Promise.all(urls.map((url) => readSourceImage(url)));
    const rendered = await photoroomVirtualModel(buffers[0], buffers.slice(1), {
      model: payload.model,
      scene: payload.scene,
      pose: payload.pose,
      prompt: payload.prompt,
    });
    const resultUrl = await saveProductImage(rendered.buffer, rendered.ext);
    const nextLibrary = addGeneratedToLibrary(library, urls[0], resultUrl, 'virtual-model');
    const nextImages = shownUrlsFromLibrary(nextLibrary);
    if (clothId) {
      await M().Cloth.findByIdAndUpdate(clothId, {
        images: nextImages,
        imageLibrary: nextLibrary,
      });
    }
    if (!access.session.isPlatformAdmin) {
      await M().User.findByIdAndUpdate(ownerId, { imageTokens: Math.max(0, balance - spent) });
    }
    await M().ImageEdit.create({
      _userId: oid(ownerId),
      _clothId: clothId ? oid(clothId) : undefined,
      styleId: 'virtual-model',
      sourceUrl: urls[0],
      resultUrl,
      timeStamp: new Date(),
    });
    return ok(
      serialize({
        resultUrl,
        images: nextImages,
        imageLibrary: nextLibrary,
        imageTokens: access.session.isPlatformAdmin ? balance : Math.max(0, balance - spent),
        spent,
      }),
      'عکس مدل ساخته شد و به نسخه‌های هوش مصنوعی اضافه شد',
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message) return fail(message);
    return fail('ساخت عکس مدل ناموفق بود');
  }
}
