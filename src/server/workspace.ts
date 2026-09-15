import mongoose from 'mongoose';
import { BRAND_COLORS, PHONE_RE, type StoreRole, type StoreStaffRole } from '@/lib/constants';
import type { Workspace, WorkspaceBrand, WorkspaceStore } from '@/lib/types';
import { db, dbEngine, serialize } from './db';
import { fileModels } from './file-db';
import * as mongo from './models';
import { fail, failAuth, ok, type ActionResult } from './result';
import { requireSession, setAuthCookies, signTokens, type Session } from './session';

function M() {
  return dbEngine() === 'file' ? fileModels : mongo;
}

function oid(value: unknown) {
  if (value == null || value === '') return undefined;
  const s = String(value);
  return mongoose.Types.ObjectId.isValid(s) ? new mongoose.Types.ObjectId(s) : value;
}

function idOf(value: unknown) {
  if (value == null) return '';
  if (typeof value === 'object' && value && '_id' in value) return String((value as { _id: unknown })._id);
  return String(value);
}

function isPlatformAdmin(phonenumber: string) {
  return Boolean(process.env.ADMIN_PHONENUMBER) && phonenumber === process.env.ADMIN_PHONENUMBER;
}

async function dropLegacyStoreUniqueIndex() {
  if (dbEngine() !== 'mongo') return;
  try {
    await mongoose.connection.collection('stores').dropIndex('_userId_1');
  } catch {
    /* index may already be gone */
  }
}

export async function migrateLegacyStores(userId: string, fullName?: string, phonenumber?: string) {
  await dropLegacyStoreUniqueIndex();
  const owned = await M().Brand.find({ _userId: oid(userId), isDeleted: false }).lean();
  const legacy = await M().Store.find({ _userId: oid(userId) }).lean();
  const unmigrated = (legacy || []).filter((store: any) => !store._brandId);
  if (!unmigrated.length) return owned;

  let brand = owned[0];
  if (!brand) {
    brand = await M().Brand.create({
      _userId: oid(userId),
      name: fullName || 'برند من',
      color: BRAND_COLORS[0],
      isDeleted: false,
    });
  }

  for (const store of unmigrated) {
    const branches = await M().StoreBranch.find({ _storeId: store._id, isDeleted: false }).lean();
    const main = branches.find((b: any) => b.isMain) || branches[0];
    await M().Store.updateOne(
      { _id: store._id },
      {
        _brandId: brand._id,
        name: main?.name || store.name || 'فروشگاه اصلی',
        address: main?.address || store.address || '',
        phonenumbers: main?.phonenumbers || store.phonenumbers || phonenumber || '',
        city: main?.city ?? store.city ?? '',
        isMain: true,
        isDeleted: false,
      },
    );
    for (const branch of branches.filter((b: any) => String(b._id) !== String(main?._id))) {
      await M().Store.create({
        _brandId: brand._id,
        _userId: oid(userId),
        name: branch.name,
        address: branch.address || '',
        phonenumbers: branch.phonenumbers || '',
        city: branch.city ?? '',
        isMain: false,
        isDeleted: false,
      });
      await M().StoreBranch.updateOne({ _id: branch._id }, { isDeleted: true });
    }
    if (main) await M().StoreBranch.updateOne({ _id: main._id }, { isDeleted: true });
    await M().Cloth.updateMany(
      { _storeId: store._id, isDeleted: false },
      { _brandId: brand._id, sellInAllStores: false, _storeIds: [store._id] },
    );
  }
  return M().Brand.find({ _userId: oid(userId), isDeleted: false }).lean();
}

export async function activateMemberships(userId: string, phonenumber: string) {
  const rows = await M().StoreMember.find({ phonenumber, isDeleted: false }).lean();
  for (const row of rows) {
    await M().StoreMember.updateOne(
      { _id: row._id },
      { _userId: oid(userId), status: 'active' },
    );
  }
}

export async function ensureOwnerWorkspace(userId: string, fullName?: string, phonenumber?: string) {
  const brands = await migrateLegacyStores(userId, fullName, phonenumber);
  const memberships = await M().StoreMember.countDocuments({
    isDeleted: false,
    $or: [{ _userId: oid(userId) }, { phonenumber }],
  });
  if ((brands || []).length) {
    for (const brand of brands) {
      const storeCount = await M().Store.countDocuments({ _brandId: brand._id, isDeleted: false });
      if (!storeCount) {
        await M().Store.create({
          _brandId: brand._id,
          _userId: oid(userId),
          name: 'فروشگاه اصلی',
          phonenumbers: phonenumber || '',
          isMain: true,
          isDeleted: false,
        });
      }
    }
    return;
  }
  if (memberships) return;
  const brand = await M().Brand.create({
    _userId: oid(userId),
    name: fullName || 'برند من',
    color: BRAND_COLORS[0],
    isDeleted: false,
  });
  await M().Store.create({
    _brandId: brand._id,
    _userId: oid(userId),
    name: 'فروشگاه اصلی',
    phonenumbers: phonenumber || '',
    isMain: true,
    isDeleted: false,
  });
}

export async function accessibleStores(userId: string, phonenumber: string) {
  const ownedBrands = await M().Brand.find({ _userId: oid(userId), isDeleted: false }).lean();
  const ownedBrandIds = ownedBrands.map((b: any) => b._id);
  const ownedStores = ownedBrandIds.length
    ? await M().Store.find({ _brandId: { $in: ownedBrandIds }, isDeleted: false }).lean()
    : [];
  const memberships = await M().StoreMember.find({
    isDeleted: false,
    status: { $in: ['pending', 'active'] },
    $or: [{ _userId: oid(userId) }, { phonenumber }],
  }).lean();
  const memberStoreIds = memberships.map((m: any) => m._storeId);
  const memberStores = memberStoreIds.length
    ? await M().Store.find({ _id: { $in: memberStoreIds }, isDeleted: false }).lean()
    : [];
  const byId = new Map<string, any>();
  for (const store of [...ownedStores, ...memberStores]) byId.set(String(store._id), store);
  return { ownedBrands, stores: [...byId.values()], memberships };
}

export async function resolveStoreRole(session: Session): Promise<StoreRole | null> {
  if (isPlatformAdmin(session.phonenumber)) {
    if (!session._storeId) {
      const context = await resolveLoginContext(session._id, session.phonenumber, session);
      if (context) {
        session._storeId = context._storeId;
        session._brandId = context._brandId;
        session.storeRole = 'owner';
      }
    }
    return 'owner';
  }
  if (!session._storeId) return null;
  const store = await M().Store.findOne({ _id: oid(session._storeId), isDeleted: false }).lean();
  if (!store) return null;
  const brandId = idOf(store._brandId);
  if (brandId) session._brandId = brandId;
  const brand = brandId ? await M().Brand.findOne({ _id: oid(brandId), isDeleted: false }).lean() : null;
  if (brand && String(brand._userId) === session._id) return 'owner';
  const member = await M().StoreMember.findOne({
    _storeId: oid(session._storeId),
    isDeleted: false,
    status: 'active',
    $or: [{ _userId: oid(session._id) }, { phonenumber: session.phonenumber }],
  }).lean();
  if (!member) return null;
  return member.role as StoreStaffRole;
}

export async function resolveLoginContext(userId: string, phonenumber: string, preferred?: Partial<Session>) {
  const { ownedBrands, stores, memberships } = await accessibleStores(userId, phonenumber);
  if (!stores.length) return null;
  const preferredStore = preferred?._storeId
    ? stores.find((s: any) => String(s._id) === String(preferred._storeId))
    : null;
  const store = preferredStore || stores[0];
  const brandId = idOf(store._brandId);
  const owned = ownedBrands.some((b: any) => String(b._id) === brandId);
  const member = memberships.find((m: any) => String(m._storeId) === String(store._id));
  const storeRole: StoreRole = owned || isPlatformAdmin(phonenumber) ? 'owner' : ((member?.role as StoreStaffRole) || 'other');
  return {
    _storeId: String(store._id),
    _brandId: brandId,
    storeRole,
  };
}

export async function withWorkspace() {
  try {
    await db();
  } catch (error) {
    return {
      error: fail(error instanceof Error ? error.message : 'اتصال به پایگاه داده برقرار نشد', 500) as ActionResult,
    };
  }
  const auth = await requireSession();
  if ('error' in auth) return { error: auth.error as ActionResult };
  const role = await resolveStoreRole(auth.session);
  if (!role) return { error: fail('به این فروشگاه دسترسی ندارید', 403) as ActionResult };
  return { session: { ...auth.session, storeRole: role, isPlatformAdmin: isPlatformAdmin(auth.session.phonenumber) } };
}

function memberView(row: any) {
  return {
    _id: String(row._id),
    _brandId: idOf(row._brandId),
    _storeId: idOf(row._storeId),
    phonenumber: String(row.phonenumber),
    fullName: row.fullName || '',
    role: row.role as StoreStaffRole,
    status: row.status as 'pending' | 'active',
  };
}

export async function getWorkspace(): Promise<ActionResult<Workspace>> {
  const auth = await requireSession();
  if ('error' in auth) return auth.error as ActionResult<Workspace>;
  await db();
  const user = await M().User.findById(auth.session._id).select('-password -refreshToken').lean();
  if (!user) return failAuth();
  await migrateLegacyStores(String(user._id), user.fullName, user.phonenumber);
  await activateMemberships(String(user._id), String(user.phonenumber));
  await ensureOwnerWorkspace(String(user._id), user.fullName, user.phonenumber);
  const { ownedBrands, stores } = await accessibleStores(String(user._id), String(user.phonenumber));
  if (!stores.length) return fail('فروشگاهی برای این حساب پیدا نشد', 404);

  const context = await resolveLoginContext(String(user._id), String(user.phonenumber), auth.session);
  if (!context) return fail('فروشگاهی برای این حساب پیدا نشد', 404);

  const storeIds = stores.map((s: any) => s._id);
  const allMembers = storeIds.length
    ? await M().StoreMember.find({ _storeId: { $in: storeIds }, isDeleted: false }).lean()
    : [];
  const membersByStore = new Map<string, ReturnType<typeof memberView>[]>();
  for (const member of allMembers) {
    const key = idOf(member._storeId);
    const list = membersByStore.get(key) || [];
    list.push(memberView(member));
    membersByStore.set(key, list);
  }

  const workspaceStores: WorkspaceStore[] = stores.map((store: any) => ({
    _id: String(store._id),
    _brandId: idOf(store._brandId),
    name: store.name || 'فروشگاه',
    address: store.address || '',
    phonenumbers: store.phonenumbers || '',
    city: store.city ?? '',
    isMain: Boolean(store.isMain),
    members: membersByStore.get(String(store._id)) || [],
  }));

  const memberBrandIds = [...new Set(workspaceStores.map((s) => s._brandId).filter(Boolean))];
  const extraBrands = memberBrandIds.length
    ? await M().Brand.find({ _id: { $in: memberBrandIds }, isDeleted: false }).lean()
    : [];
  const brandMap = new Map<string, any>();
  for (const brand of [...ownedBrands, ...extraBrands]) brandMap.set(String(brand._id), brand);

  const brands: WorkspaceBrand[] = [...brandMap.values()].map((brand: any) => {
    const brandStores = workspaceStores.filter((s) => s._brandId === String(brand._id));
    return {
      _id: String(brand._id),
      name: brand.name,
      logo: brand.logo || '',
      color: brand.color || BRAND_COLORS[0],
      description: brand.description || '',
      _userId: idOf(brand._userId),
      storeCount: brandStores.length,
      memberCount: brandStores.reduce((sum, s) => sum + s.members.length, 0),
    };
  });

  const role = await resolveStoreRole({ ...auth.session, ...context });
  return ok(
    serialize({
      user: {
        _id: String(user._id),
        fullName: user.fullName || '',
        phonenumber: String(user.phonenumber),
      },
      brands,
      stores: workspaceStores,
      activeBrandId: context._brandId,
      activeStoreId: context._storeId,
      storeRole: role || context.storeRole,
      isPlatformAdmin: isPlatformAdmin(String(user.phonenumber)),
      contextChanged:
        context._storeId !== auth.session._storeId || context._brandId !== auth.session._brandId,
    }),
  );
}

export async function switchWorkspace(payload: { brandId: string; storeId: string }): Promise<ActionResult> {
  const auth = await requireSession();
  if ('error' in auth) return auth.error;
  await db();
  const context = await resolveLoginContext(auth.session._id, auth.session.phonenumber, {
    ...auth.session,
    _storeId: payload.storeId,
    _brandId: payload.brandId,
  });
  if (!context || context._storeId !== payload.storeId) return fail('به این فروشگاه دسترسی ندارید', 403);
  const session: Session = {
    ...auth.session,
    _storeId: context._storeId,
    _brandId: context._brandId,
    storeRole: context.storeRole,
  };
  const tokens = signTokens(session);
  await M().User.updateOne({ _id: session._id }, { refreshToken: tokens.refreshToken });
  await setAuthCookies(tokens);
  return ok({ _brandId: session._brandId, _storeId: session._storeId, storeRole: session.storeRole }, 'فروشگاه فعال شد');
}

function nextBrandColor(count: number) {
  return BRAND_COLORS[count % BRAND_COLORS.length];
}

export async function createBrand(payload: Record<string, unknown>): Promise<ActionResult> {
  const access = await withWorkspace();
  if ('error' in access) return access.error;
  if (access.session.storeRole !== 'owner' && !access.session.isPlatformAdmin) {
    return fail('فقط صاحب برند می‌تواند برند جدید بسازد', 403);
  }
  const name = String(payload.name || '').trim();
  if (!name) return fail('نام برند الزامی است');
  const count = await M().Brand.countDocuments({ _userId: oid(access.session._id), isDeleted: false });
  const brand = await M().Brand.create({
    _userId: oid(access.session._id),
    name,
    logo: String(payload.logo || ''),
    color: String(payload.color || nextBrandColor(count)),
    description: String(payload.description || ''),
    isDeleted: false,
  });
  const store = await M().Store.create({
    _brandId: brand._id,
    _userId: oid(access.session._id),
    name: String(payload.storeName || 'فروشگاه اصلی'),
    isMain: true,
    isDeleted: false,
  });
  return ok(serialize({ brand: brand.toObject ? brand.toObject() : brand, store: store.toObject ? store.toObject() : store }), 'برند ساخته شد');
}

export async function updateBrand(id: string, payload: Record<string, unknown>): Promise<ActionResult> {
  const access = await withWorkspace();
  if ('error' in access) return access.error;
  const brand = await M().Brand.findOne({ _id: oid(id), isDeleted: false }).lean();
  if (!brand) return fail('برند پیدا نشد', 404);
  if (String(brand._userId) !== access.session._id && !access.session.isPlatformAdmin) {
    return fail('اجازه ویرایش این برند را ندارید', 403);
  }
  const next: Record<string, unknown> = {};
  if (payload.name != null) next.name = String(payload.name).trim();
  if (payload.logo != null) next.logo = String(payload.logo);
  if (payload.color != null) next.color = String(payload.color);
  if (payload.description != null) next.description = String(payload.description);
  const updated = await M().Brand.findOneAndUpdate({ _id: oid(id) }, next, { new: true });
  return ok(serialize(updated?.toObject ? updated.toObject() : updated), 'برند ویرایش شد');
}

export async function deleteBrand(id: string): Promise<ActionResult> {
  const access = await withWorkspace();
  if ('error' in access) return access.error;
  const brand = await M().Brand.findOne({ _id: oid(id), isDeleted: false }).lean();
  if (!brand) return fail('برند پیدا نشد', 404);
  if (String(brand._userId) !== access.session._id && !access.session.isPlatformAdmin) {
    return fail('اجازه حذف این برند را ندارید', 403);
  }
  const count = await M().Brand.countDocuments({ _userId: oid(access.session._id), isDeleted: false });
  if (count <= 1) return fail('حداقل یک برند باید باقی بماند');
  await M().Brand.updateOne({ _id: oid(id) }, { isDeleted: true });
  await M().Store.updateMany({ _brandId: oid(id) }, { isDeleted: true });
  return ok(null, 'برند حذف شد');
}

async function requireBrandOwner(session: Session, brandId: string) {
  const brand = await M().Brand.findOne({ _id: oid(brandId), isDeleted: false }).lean();
  if (!brand) return { error: fail('برند پیدا نشد', 404) };
  if (String(brand._userId) !== session._id && !isPlatformAdmin(session.phonenumber)) {
    return { error: fail('اجازه تغییر فروشگاه‌های این برند را ندارید', 403) };
  }
  return { brand };
}

export async function createStore(payload: Record<string, unknown>): Promise<ActionResult> {
  const access = await withWorkspace();
  if ('error' in access) return access.error;
  const brandId = String(payload._brandId || access.session._brandId || '');
  const owned = await requireBrandOwner(access.session, brandId);
  if ('error' in owned) return owned.error;
  const name = String(payload.name || '').trim();
  if (!name) return fail('نام فروشگاه الزامی است');
  const store = await M().Store.create({
    _brandId: oid(brandId),
    _userId: oid(access.session._id),
    name,
    address: String(payload.address || ''),
    phonenumbers: String(payload.phonenumbers || ''),
    city: payload.city ?? '',
    isMain: Boolean(payload.isMain),
    isDeleted: false,
  });
  return ok(serialize(store.toObject ? store.toObject() : store), 'فروشگاه اضافه شد');
}

export async function updateStore(id: string, payload: Record<string, unknown>): Promise<ActionResult> {
  const access = await withWorkspace();
  if ('error' in access) return access.error;
  const store = await M().Store.findOne({ _id: oid(id), isDeleted: false }).lean();
  if (!store) return fail('فروشگاه پیدا نشد', 404);
  const owned = String((await M().Brand.findOne({ _id: store._brandId }).lean())?._userId) === access.session._id;
  const adminHere = access.session.storeRole === 'admin' && access.session._storeId === String(store._id);
  if (!owned && !adminHere && !access.session.isPlatformAdmin) return fail('اجازه ویرایش این فروشگاه را ندارید', 403);
  const next: Record<string, unknown> = {};
  for (const key of ['name', 'address', 'phonenumbers', 'city'] as const) {
    if (payload[key] != null) next[key] = payload[key];
  }
  const updated = await M().Store.findOneAndUpdate({ _id: oid(id) }, next, { new: true });
  return ok(serialize(updated?.toObject ? updated.toObject() : updated), 'فروشگاه ویرایش شد');
}

export async function deleteStore(id: string): Promise<ActionResult> {
  const access = await withWorkspace();
  if ('error' in access) return access.error;
  const store = await M().Store.findOne({ _id: oid(id), isDeleted: false }).lean();
  if (!store) return fail('فروشگاه پیدا نشد', 404);
  const owned = await requireBrandOwner(access.session, idOf(store._brandId));
  if ('error' in owned) return owned.error;
  const remaining = await M().Store.countDocuments({ _brandId: store._brandId, isDeleted: false });
  if (remaining <= 1) return fail('هر برند باید حداقل یک فروشگاه داشته باشد');
  await M().Store.updateOne({ _id: oid(id) }, { isDeleted: true });
  await M().StoreMember.updateMany({ _storeId: oid(id) }, { isDeleted: true });
  return ok(null, 'فروشگاه حذف شد');
}

export async function inviteStoreMember(payload: Record<string, unknown>): Promise<ActionResult> {
  const access = await withWorkspace();
  if ('error' in access) return access.error;
  const storeId = String(payload._storeId || access.session._storeId);
  const store = await M().Store.findOne({ _id: oid(storeId), isDeleted: false }).lean();
  if (!store) return fail('فروشگاه پیدا نشد', 404);
  const owned = String((await M().Brand.findOne({ _id: store._brandId }).lean())?._userId) === access.session._id;
  const adminHere = access.session.storeRole === 'admin' && access.session._storeId === String(store._id);
  if (!owned && !adminHere && !access.session.isPlatformAdmin) return fail('اجازه دعوت به این فروشگاه را ندارید', 403);
  const phonenumber = String(payload.phonenumber || '').trim();
  if (!PHONE_RE.test(phonenumber)) return fail('شماره موبایل معتبر نیست');
  if (phonenumber === access.session.phonenumber) return fail('نمی‌توانید خودتان را دعوت کنید');
  const role = String(payload.role || '') as StoreStaffRole;
  if (!['admin', 'seller', 'other'].includes(role)) return fail('نقش نامعتبر است');
  const existing = await M().StoreMember.findOne({ _storeId: store._id, phonenumber, isDeleted: false }).lean();
  if (existing) return fail('این شماره قبلاً به فروشگاه اضافه شده است');
  const user = await M().User.findOne({ phonenumber }).lean();
  const member = await M().StoreMember.create({
    _brandId: store._brandId,
    _storeId: store._id,
    phonenumber,
    _userId: user?._id || null,
    fullName: String(payload.fullName || user?.fullName || ''),
    role,
    status: user ? 'active' : 'pending',
    invitedBy: oid(access.session._id),
    isDeleted: false,
  });
  return ok(serialize(member.toObject ? member.toObject() : member), user ? 'همکار اضافه شد' : 'دعوت در انتظار ورود است');
}

export async function updateStoreMember(id: string, payload: Record<string, unknown>): Promise<ActionResult> {
  const access = await withWorkspace();
  if ('error' in access) return access.error;
  const member = await M().StoreMember.findOne({ _id: oid(id), isDeleted: false }).lean();
  if (!member) return fail('همکار پیدا نشد', 404);
  const owned = String((await M().Brand.findOne({ _id: member._brandId }).lean())?._userId) === access.session._id;
  const adminHere = access.session.storeRole === 'admin' && access.session._storeId === String(member._storeId);
  if (!owned && !adminHere && !access.session.isPlatformAdmin) return fail('اجازه تغییر این همکار را ندارید', 403);
  const next: Record<string, unknown> = {};
  if (payload.role != null) {
    const role = String(payload.role);
    if (!['admin', 'seller', 'other'].includes(role)) return fail('نقش نامعتبر است');
    next.role = role;
  }
  if (payload.fullName != null) next.fullName = String(payload.fullName);
  const updated = await M().StoreMember.findOneAndUpdate({ _id: oid(id) }, next, { new: true });
  return ok(serialize(updated?.toObject ? updated.toObject() : updated), 'همکار ویرایش شد');
}

export async function removeStoreMember(id: string): Promise<ActionResult> {
  const access = await withWorkspace();
  if ('error' in access) return access.error;
  const member = await M().StoreMember.findOne({ _id: oid(id), isDeleted: false }).lean();
  if (!member) return fail('همکار پیدا نشد', 404);
  const owned = String((await M().Brand.findOne({ _id: member._brandId }).lean())?._userId) === access.session._id;
  const adminHere = access.session.storeRole === 'admin' && access.session._storeId === String(member._storeId);
  if (!owned && !adminHere && !access.session.isPlatformAdmin) return fail('اجازه حذف این همکار را ندارید', 403);
  await M().StoreMember.updateOne({ _id: oid(id) }, { isDeleted: true });
  return ok(null, 'همکار حذف شد');
}
