import mongoose from 'mongoose';
import { clothBrandIds, clothStoreIds } from '@/lib/cloth-share';
import { requirePlatformAdmin } from './admin';
import { db, dbEngine, serialize } from './db';
import { fileModels } from './file-db';
import * as mongo from './models';
import { fail, ok, type ActionResult } from './result';

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

async function adminUserIds() {
  const phone = String(process.env.ADMIN_PHONENUMBER || '').trim();
  if (!phone) return new Set<string>();
  const users = await M().User.find({ phonenumber: phone }).select('_id').lean();
  return new Set((users as any[]).map((user) => String(user._id)));
}

function emptySales() {
  return { total: 0, invoices: 0 };
}

function addSales(target: { total: number; invoices: number }, amount: number) {
  target.total += amount;
  target.invoices += 1;
}

async function salesByStore() {
  const [invoices, lines] = await Promise.all([
    M().Invoice.find({ isDeleted: false }).select('_id _storeId').lean(),
    M().CustomerCart.find({ isDeleted: false }).select('_invoice count price').lean(),
  ]);
  const byInvoice = new Map<string, number>();
  for (const line of lines as any[]) {
    const invoiceId = idOf(line._invoice);
    if (!invoiceId) continue;
    byInvoice.set(invoiceId, (byInvoice.get(invoiceId) || 0) + Number(line.count || 0) * Number(line.price || 0));
  }
  const byStore = new Map<string, { total: number; invoices: number }>();
  for (const invoice of invoices as any[]) {
    const storeId = idOf(invoice._storeId);
    if (!storeId) continue;
    const bucket = byStore.get(storeId) || emptySales();
    addSales(bucket, byInvoice.get(String(invoice._id)) || 0);
    byStore.set(storeId, bucket);
  }
  return byStore;
}

function sumSales(parts: { total: number; invoices: number }[]) {
  return parts.reduce(
    (sum, part) => ({ total: sum.total + part.total, invoices: sum.invoices + part.invoices }),
    emptySales(),
  );
}

async function ownedByAdmin(userId: unknown, adminIds: Set<string>) {
  const id = idOf(userId);
  return Boolean(id && adminIds.has(id));
}

export async function getWebsiteListingBoard(): Promise<ActionResult> {
  const access = await requirePlatformAdmin('website');
  if ('error' in access) return access.error;
  await db();
  const adminIds = await adminUserIds();
  const [users, brands, stores, clothes] = await Promise.all([
    M().User.find().select('_id fullName phonenumber websiteListing').lean(),
    M().Brand.find({ isDeleted: false }).sort('name').lean(),
    M().Store.find({ isDeleted: false }).sort('name').lean(),
    M()
      .Cloth.find({ isDeleted: false, publishRequested: true, published: { $ne: true } })
      .select('code _brandIds _storeIds _brandId _storeId _type')
      .populate({ path: '_type', select: 'name' })
      .sort('code')
      .lean(),
  ]);
  const userById = new Map((users as any[]).map((user) => [String(user._id), user]));
  const storeSales = await salesByStore();
  const sellerBrands = (brands as any[]).filter((brand) => !adminIds.has(idOf(brand._userId)));
  const brandName = new Map((brands as any[]).map((brand) => [String(brand._id), String(brand.name || 'برند')]));
  const storeName = new Map((stores as any[]).map((store) => [String(store._id), String(store.name || 'فروشگاه')]));
  const brandOwner = new Map((brands as any[]).map((brand) => [String(brand._id), idOf(brand._userId)]));

  const brandsByOwner = new Map<string, any[]>();
  for (const brand of sellerBrands) {
    const ownerId = idOf(brand._userId);
    const list = brandsByOwner.get(ownerId) || [];
    list.push(brand);
    brandsByOwner.set(ownerId, list);
  }

  const userRows = [...brandsByOwner.entries()].map(([ownerId, ownedBrands]) => {
    const owner = userById.get(ownerId);
    const brandNodes = ownedBrands.map((brand) => {
      const brandStores = (stores as any[])
        .filter((store) => idOf(store._brandId) === String(brand._id))
        .map((store) => ({
          _id: String(store._id),
          name: String(store.name || 'فروشگاه'),
          websiteListing: Boolean(store.websiteListing),
          sales: storeSales.get(String(store._id)) || emptySales(),
        }));
      return {
        _id: String(brand._id),
        name: String(brand.name || 'برند'),
        websiteListing: Boolean(brand.websiteListing),
        sales: sumSales(brandStores.map((store) => store.sales)),
        stores: brandStores,
      };
    });
    return {
      _id: ownerId,
      name: String(owner?.fullName || 'کاربر'),
      phone: String(owner?.phonenumber || ''),
      websiteListing: Boolean(owner?.websiteListing),
      sales: sumSales(brandNodes.map((brand) => brand.sales)),
      brands: brandNodes,
    };
  });

  const requests = (clothes as any[])
    .filter((cloth) => {
      const owners = clothBrandIds(cloth)
        .map((id) => brandOwner.get(id))
        .filter(Boolean);
      return !(owners.length && owners.every((id) => adminIds.has(String(id))));
    })
    .map((cloth) => {
      const typeName =
        cloth._type && typeof cloth._type === 'object' ? String(cloth._type.name || '') : '';
      return {
        _id: String(cloth._id),
        code: String(cloth.code || ''),
        typeName,
        brands: clothBrandIds(cloth)
          .map((id) => brandName.get(id) || 'برند')
          .join('، '),
        stores: clothStoreIds(cloth)
          .map((id) => storeName.get(id) || 'فروشگاه')
          .join('، '),
        ownerIds: [
          ...new Set(
            clothBrandIds(cloth)
              .map((id) => brandOwner.get(id))
              .filter(Boolean),
          ),
        ],
        brandIds: clothBrandIds(cloth),
        storeIds: clothStoreIds(cloth),
      };
    });

  return ok(serialize({ users: userRows, requests }));
}

export async function setWebsiteListing(
  kind: 'user' | 'brand' | 'store' | 'user-brands' | 'brand-stores',
  id: string,
  enabled: boolean,
): Promise<ActionResult> {
  const access = await requirePlatformAdmin('website');
  if ('error' in access) return access.error;
  await db();
  const adminIds = await adminUserIds();
  const on = Boolean(enabled);
  if (kind === 'user' || kind === 'user-brands') {
    const user = await M().User.findById(id).select('_id phonenumber').lean();
    if (!user) return fail('کاربر پیدا نشد', 404);
    if (adminIds.has(String((user as any)._id))) return fail('ادمین در این فهرست نیست');
    if (kind === 'user') {
      await M().User.findByIdAndUpdate(id, { websiteListing: on });
      return ok({ _id: id, websiteListing: on }, on ? 'انتشار برای این کاربر باز شد' : 'انتشار برای این کاربر بسته شد');
    }
    const owned = await M().Brand.find({ _userId: oid(id), isDeleted: false }).select('_id').lean();
    for (const brand of owned as any[]) {
      await M().Brand.findByIdAndUpdate(String(brand._id), { websiteListing: on });
    }
    return ok({ _id: id, websiteListing: on }, on ? 'انتشار برای برندهای این کاربر باز شد' : 'انتشار برای برندهای این کاربر بسته شد');
  }
  if (kind === 'brand' || kind === 'brand-stores') {
    const brand = await M().Brand.findOne({ _id: oid(id), isDeleted: false }).lean();
    if (!brand) return fail('برند پیدا نشد', 404);
    if (await ownedByAdmin((brand as any)._userId, adminIds)) return fail('برند ادمین در این فهرست نیست');
    if (kind === 'brand') {
      await M().Brand.findByIdAndUpdate(id, { websiteListing: on });
      return ok({ _id: id, websiteListing: on }, on ? 'انتشار برای این برند باز شد' : 'انتشار برای این برند بسته شد');
    }
    const ownedStores = await M().Store.find({ _brandId: oid(id), isDeleted: false }).select('_id').lean();
    for (const store of ownedStores as any[]) {
      await M().Store.findByIdAndUpdate(String(store._id), { websiteListing: on });
    }
    return ok({ _id: id, websiteListing: on }, on ? 'انتشار برای فروشگاه‌های این برند باز شد' : 'انتشار برای فروشگاه‌های این برند بسته شد');
  }
  const store = await M().Store.findOne({ _id: oid(id), isDeleted: false }).lean();
  if (!store) return fail('فروشگاه پیدا نشد', 404);
  const brand = (store as any)._brandId
    ? await M().Brand.findById((store as any)._brandId).select('_userId').lean()
    : null;
  if (await ownedByAdmin((brand as any)?._userId || (store as any)._userId, adminIds)) {
    return fail('فروشگاه ادمین در این فهرست نیست');
  }
  await M().Store.findByIdAndUpdate(id, { websiteListing: on });
  return ok({ _id: id, websiteListing: on }, on ? 'انتشار برای این فروشگاه باز شد' : 'انتشار برای این فروشگاه بسته شد');
}

async function sellerClothIds(ids: string[]) {
  const adminIds = await adminUserIds();
  const unique = [...new Set(ids.map((id) => String(id || '').trim()).filter(Boolean))];
  if (!unique.length) return [];
  const clothes = await M()
    .Cloth.find({ _id: { $in: unique.map((id) => oid(id)) }, isDeleted: false })
    .select('_id _brandIds _brandId')
    .lean();
  const brandIds = [...new Set((clothes as any[]).flatMap((cloth) => clothBrandIds(cloth)))];
  const brands = brandIds.length
    ? await M().Brand.find({ _id: { $in: brandIds.map((id) => oid(id)) } }).select('_id _userId').lean()
    : [];
  const brandOwner = new Map((brands as any[]).map((brand) => [String(brand._id), idOf(brand._userId)]));
  return (clothes as any[])
    .filter((cloth) => {
      const owners = clothBrandIds(cloth)
        .map((id) => brandOwner.get(id))
        .filter(Boolean);
      return !(owners.length && owners.every((owner) => adminIds.has(String(owner))));
    })
    .map((cloth) => String(cloth._id));
}

export async function publishWebsiteClothes(ids: string[]): Promise<ActionResult> {
  const access = await requirePlatformAdmin('website');
  if ('error' in access) return access.error;
  await db();
  const kept = await sellerClothIds(ids);
  if (!kept.length) return fail('لباسی برای انتشار انتخاب نشده');
  for (const id of kept) {
    await M().Cloth.findByIdAndUpdate(id, { published: true, publishRequested: false });
  }
  return ok({ count: kept.length }, 'لباس‌های انتخاب‌شده در وب‌سایت منتشر شد');
}

export async function dismissWebsiteClothes(ids: string[]): Promise<ActionResult> {
  const access = await requirePlatformAdmin('website');
  if ('error' in access) return access.error;
  await db();
  const kept = await sellerClothIds(ids);
  if (!kept.length) return fail('لباسی انتخاب نشده');
  for (const id of kept) {
    await M().Cloth.findByIdAndUpdate(id, { publishRequested: false });
  }
  return ok({ count: kept.length }, 'درخواست انتشار رد شد');
}
