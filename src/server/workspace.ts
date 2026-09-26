import mongoose from 'mongoose';
import { BRAND_COLORS, PHONE_RE, type StoreRole, type StoreStaffRole } from '@/lib/constants';
import {
  idList,
  partnerAppliesToStore,
  partnerBrandIds,
  partnerStoreIds,
  sharePercentTotal,
} from '@/lib/partners';
import type { Workspace, WorkspaceBrand, WorkspaceStore } from '@/lib/types';
import { asStringList, normalizeStoreContacts, storePhones } from '@/lib/store-contacts';
import { db, dbEngine, serialize } from './db';
import { fileModels } from './file-db';
import * as mongo from './models';
import { fail, failAuth, failDb, ok, type ActionResult } from './result';
import { requireSession, setAuthCookies, signTokens, type Session } from './session';
import { livePlanCatalog } from './plan-catalog';
import { listPurchases, subscriptionForSession } from './subscription';
import {
  acceptedTeamRows,
  activateTeamMemberships,
  isSuperuserPhone,
  ownedPeopleFor,
  ownedTeamsFor,
  pendingInvitesFor,
  permissionsForStore,
  storesForTeams,
} from './teams';
import { resolveAdminPermissions } from '@/lib/admin-permissions';
import { OWNER_PERMISSIONS } from '@/lib/permissions';

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
  return isSuperuserPhone(phonenumber);
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
  await activateTeamMemberships(userId, phonenumber);
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
  } else if (!memberships) {
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
  const teamAccess = await acceptedTeamRows(userId, phonenumber);
  const teamStores = await storesForTeams(teamAccess.teams, teamAccess.members);
  const byId = new Map<string, any>();
  for (const store of [...ownedStores, ...memberStores, ...teamStores]) byId.set(String(store._id), store);
  return { ownedBrands, stores: [...byId.values()], memberships, teamAccess };
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
  if (member) return member.role as StoreStaffRole;
  const teamAccess = await acceptedTeamRows(session._id, session.phonenumber);
  const perms = permissionsForStore(teamAccess.members, teamAccess.teamById, String(session._storeId), brandId);
  if (perms.length) return 'other';
  return null;
}

export async function resolveLoginContext(userId: string, phonenumber: string, preferred?: Partial<Session>) {
  const { ownedBrands, stores, memberships, teamAccess } = await accessibleStores(userId, phonenumber);
  if (!stores.length) return null;
  const preferredStore = preferred?._storeId
    ? stores.find((s: any) => String(s._id) === String(preferred._storeId))
    : null;
  const store = preferredStore || stores[0];
  const brandId = idOf(store._brandId);
  const owned = ownedBrands.some((b: any) => String(b._id) === brandId);
  const member = memberships.find((m: any) => String(m._storeId) === String(store._id));
  const teamPerms = permissionsForStore(
    teamAccess?.members || [],
    teamAccess?.teamById || new Map(),
    String(store._id),
    brandId,
  );
  const storeRole: StoreRole = owned || isPlatformAdmin(phonenumber)
    ? 'owner'
    : ((member?.role as StoreStaffRole) || (teamPerms.length ? 'other' : 'other'));
  return {
    _storeId: String(store._id),
    _brandId: brandId,
    storeRole,
  };
}

async function resolveAccessMeta(session: Session, role: StoreRole) {
  const superuser = isPlatformAdmin(session.phonenumber);
  if (superuser) {
    return { permissions: [...OWNER_PERMISSIONS], accessSource: 'superuser' as const, isSuperuser: true };
  }
  const store = session._storeId
    ? await M().Store.findOne({ _id: oid(session._storeId), isDeleted: false }).lean()
    : null;
  const brandId = session._brandId || idOf(store?._brandId);
  const brand = brandId ? await M().Brand.findOne({ _id: oid(brandId), isDeleted: false }).lean() : null;
  if (brand && String(brand._userId) === session._id) {
    return { permissions: [...OWNER_PERMISSIONS], accessSource: 'owner' as const, isSuperuser: false };
  }
  const teamAccess = await acceptedTeamRows(session._id, session.phonenumber);
  const teamPerms = permissionsForStore(
    teamAccess.members,
    teamAccess.teamById,
    String(session._storeId || ''),
    brandId,
  );
  if (role === 'owner') {
    return { permissions: [...OWNER_PERMISSIONS], accessSource: 'owner' as const, isSuperuser: false };
  }
  if (teamPerms.length) {
    return { permissions: teamPerms, accessSource: 'team' as const, isSuperuser: false };
  }
  return { permissions: [] as string[], accessSource: 'staff' as const, isSuperuser: false };
}

export async function withWorkspace() {
  try {
    await db();
  } catch {
    return {
      error: failDb() as ActionResult,
    };
  }
  const auth = await requireSession();
  if ('error' in auth) return { error: auth.error as ActionResult };
  const role = await resolveStoreRole(auth.session);
  if (!role) return { error: fail('به این فروشگاه دسترسی ندارید', 403) as ActionResult };
  const isAdmin = isPlatformAdmin(auth.session.phonenumber);
  const adminRow = await M().User.findById(auth.session._id).select('adminPermissions').lean();
  const adminPermissions = resolveAdminPermissions(isAdmin, (adminRow as { adminPermissions?: unknown } | null)?.adminPermissions);
  const meta = await resolveAccessMeta(auth.session, role);
  const subscription = await subscriptionForSession({ ...auth.session, storeRole: role, isPlatformAdmin: isAdmin });
  return {
    session: {
      ...auth.session,
      storeRole: role,
      isPlatformAdmin: isAdmin,
      isSuperuser: meta.isSuperuser,
      permissions: meta.permissions,
      adminPermissions,
      subscriptionActive: subscription.active,
    },
  };
}

function memberView(row: any) {
  return {
    _id: String(row._id),
    _brandId: idOf(row._brandId),
    _storeId: idOf(row._storeId),
    _warehouseId: String(row._warehouseId || ''),
    phonenumber: String(row.phonenumber),
    fullName: row.fullName || '',
    role: row.role as StoreStaffRole,
    status: row.status as 'pending' | 'active',
  };
}

function storeView(store: any, members: ReturnType<typeof memberView>[] = []) {
  const phones = storePhones(store);
  const landlines = asStringList(store.landlines);
  const warehouses = Array.isArray(store.warehouses)
    ? store.warehouses.map((row: any) => ({
        _id: String(row._id),
        name: row.name || 'انبار',
        address: row.address || '',
        city: row.city ?? '',
        phonenumbers: asStringList(row.phonenumbers ?? row.phones),
        landlines: asStringList(row.landlines),
      }))
    : [];
  return {
    _id: String(store._id),
    _brandId: idOf(store._brandId),
    name: store.name || 'فروشگاه',
    address: store.address || '',
    phonenumbers: phones.join('، ') || store.phonenumbers || '',
    phones,
    landlines,
    warehouses,
    city: store.city ?? '',
    isMain: Boolean(store.isMain),
    websiteListing: Boolean(store.websiteListing),
    members,
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

  const workspaceStores: WorkspaceStore[] = stores.map((store: any) =>
    storeView(store, membersByStore.get(String(store._id)) || []),
  );

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
      websiteListing: Boolean(brand.websiteListing),
      _userId: idOf(brand._userId),
      storeCount: brandStores.length,
      memberCount: brandStores.reduce((sum, s) => sum + s.members.length, 0),
    };
  });
  const listingOwnerIds = [...new Set(brands.map((brand) => brand._userId).filter(Boolean))];
  if (listingOwnerIds.length) {
    const owners = await M()
      .User.find({ _id: { $in: listingOwnerIds.map((id) => oid(id)) } })
      .select('_id websiteListing')
      .lean();
    const listedOwners = new Set(
      (owners as any[]).filter((owner) => owner.websiteListing).map((owner) => String(owner._id)),
    );
    for (const brand of brands) {
      brand.ownerWebsiteListing = listedOwners.has(String(brand._userId || ''));
    }
  }

  const brandIds = [...brandMap.keys()].map((id) => oid(id));
  const ownerIds = [
    ...new Set(
      [...brandMap.values()]
        .map((brand: any) => idOf(brand._userId))
        .filter(Boolean),
    ),
  ].map((id) => oid(id));
  const partnerFilter = {
    isDeleted: false,
    $or: [
      ...(ownerIds.length ? [{ _userId: { $in: ownerIds } }] : []),
      ...(brandIds.length ? [{ _brandIds: { $in: brandIds } }, { _brandId: { $in: brandIds } }] : []),
      ...(storeIds.length ? [{ _storeIds: { $in: storeIds } }, { _storeId: { $in: storeIds } }] : []),
    ],
  };
  const partnerRows = partnerFilter.$or.length
    ? await M().Partner.find(partnerFilter).sort('name').lean()
    : [];
  const partners = partnerRows.map(partnerView);

  const role = await resolveStoreRole({ ...auth.session, ...context });
  const isAdmin = isPlatformAdmin(String(user.phonenumber));
  const meta = await resolveAccessMeta({ ...auth.session, ...context }, role || context.storeRole);
  const [teams, teamPeople, pendingInvites] = await Promise.all([
    ownedTeamsFor(String(user._id)),
    ownedPeopleFor(String(user._id)),
    pendingInvitesFor(String(user._id), String(user.phonenumber)),
  ]);
  const subscription = await subscriptionForSession({
    ...auth.session,
    ...context,
    storeRole: role || context.storeRole,
    isPlatformAdmin: isAdmin,
  });
  const [purchases, planCatalog] = await Promise.all([
    role === 'owner' || isAdmin ? listPurchases(String(user._id)) : Promise.resolve([]),
    livePlanCatalog(),
  ]);
  const tokenOwnerId =
    brands.find((brand) => brand._id === context._brandId)?._userId || String(user._id);
  let imageTokens = Number(user.imageTokens || 0);
  if (tokenOwnerId && tokenOwnerId !== String(user._id)) {
    const tokenOwner = await M().User.findById(tokenOwnerId).select('imageTokens').lean();
    imageTokens = Number(tokenOwner?.imageTokens || 0);
  }
  return ok(
    serialize({
      user: {
        _id: String(user._id),
        fullName: user.fullName || '',
        phonenumber: String(user.phonenumber),
        websiteListing: Boolean(user.websiteListing),
      },
      brands,
      stores: workspaceStores,
      partners,
      activeBrandId: context._brandId,
      activeStoreId: context._storeId,
      storeRole: role || context.storeRole,
      isPlatformAdmin: isAdmin,
      isSuperuser: meta.isSuperuser,
      permissions: meta.permissions,
      adminPermissions: resolveAdminPermissions(isAdmin, user.adminPermissions),
      accessSource: meta.accessSource,
      teams,
      teamPeople,
      pendingInvites,
      subscriptionActive: subscription.active,
      subscription,
      planCatalog,
      imageTokens,
      imageTokensUnlimited: isAdmin,
      purchases,
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

function hasGranted(session: Session, permission: string) {
  return Boolean(
    session.isPlatformAdmin || session.storeRole === 'owner' || session.permissions?.includes(permission),
  );
}

function denyExpired(session: Session) {
  if (session.isPlatformAdmin) return null;
  if (session.subscriptionActive === false) {
    return fail('اشتراک تمام شده است. فقط مشاهده ممکن است. از تنظیمات اشتراک بخرید.', 403);
  }
  return null;
}

async function assertPlanLimits(session: Session, kind: 'brand' | 'store' | 'partner') {
  const expired = denyExpired(session);
  if (expired) return expired;
  if (session.isPlatformAdmin) return null;
  const sub = await subscriptionForSession(session);
  if (!sub.active) return fail('اشتراک تمام شده است. فقط مشاهده ممکن است.', 403);
  if (kind === 'partner' && !sub.allowPartners) {
    return fail('طرح فعلی اجازه ثبت شریک ندارد. طرح را ارتقا دهید.');
  }
  const ownedBrands = await M().Brand.find({ _userId: oid(session._id), isDeleted: false }).lean();
  if (kind === 'brand' && ownedBrands.length >= sub.maxBrands) {
    return fail(`طرح فعلی حداکثر ${sub.maxBrands === 99 ? 'نامحدود' : sub.maxBrands} برند می‌دهد. برای برند بیشتر طرح را ارتقا دهید.`);
  }
  if (kind === 'store') {
    const ids = ownedBrands.map((brand: any) => brand._id);
    const count = ids.length ? await M().Store.countDocuments({ _brandId: { $in: ids }, isDeleted: false }) : 0;
    if (count >= sub.maxStores) {
      return fail(`طرح فعلی حداکثر ${sub.maxStores === 99 ? 'نامحدود' : sub.maxStores} فروشگاه می‌دهد. برای فروشگاه بیشتر طرح را ارتقا دهید.`);
    }
  }
  return null;
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
  const limited = await assertPlanLimits(access.session, 'brand');
  if (limited) return limited;
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
  const expired = denyExpired(access.session);
  if (expired) return expired;
  const brand = await M().Brand.findOne({ _id: oid(id), isDeleted: false }).lean();
  if (!brand) return fail('برند پیدا نشد', 404);
  if (String(brand._userId) !== access.session._id && !hasGranted(access.session, 'workspace.write')) {
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
  const expired = denyExpired(access.session);
  if (expired) return expired;
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
  const limited = await assertPlanLimits(access.session, 'store');
  if (limited) return limited;
  const brandId = String(payload._brandId || access.session._brandId || '');
  const owned = await requireBrandOwner(access.session, brandId);
  if ('error' in owned) return owned.error;
  const name = String(payload.name || '').trim();
  if (!name) return fail('نام فروشگاه الزامی است');
  const contacts = normalizeStoreContacts(payload);
  const store = await M().Store.create({
    _brandId: oid(brandId),
    _userId: oid(access.session._id),
    name,
    address: String(payload.address || ''),
    city: payload.city ?? '',
    isMain: Boolean(payload.isMain),
    isDeleted: false,
    ...contacts,
  });
  return ok(serialize(store.toObject ? store.toObject() : store), 'فروشگاه اضافه شد');
}

export async function updateStore(id: string, payload: Record<string, unknown>): Promise<ActionResult> {
  const access = await withWorkspace();
  if ('error' in access) return access.error;
  const expired = denyExpired(access.session);
  if (expired) return expired;
  const store = await M().Store.findOne({ _id: oid(id), isDeleted: false }).lean();
  if (!store) return fail('فروشگاه پیدا نشد', 404);
  const owned = String((await M().Brand.findOne({ _id: store._brandId }).lean())?._userId) === access.session._id;
  const adminHere = access.session.storeRole === 'admin' && access.session._storeId === String(store._id);
  if (!owned && !adminHere && !hasGranted(access.session, 'workspace.write')) {
    return fail('اجازه ویرایش این فروشگاه را ندارید', 403);
  }
  const next: Record<string, unknown> = {};
  for (const key of ['name', 'address', 'city'] as const) {
    if (payload[key] != null) next[key] = payload[key];
  }
  if (payload.phones != null || payload.phonenumbers != null || payload.landlines != null || payload.warehouses != null) {
    Object.assign(next, normalizeStoreContacts({
      phones: payload.phones ?? payload.phonenumbers ?? store.phones,
      phonenumbers: payload.phonenumbers ?? store.phonenumbers,
      landlines: payload.landlines ?? store.landlines,
      warehouses: payload.warehouses ?? store.warehouses,
    }));
  }
  const updated = await M().Store.findOneAndUpdate({ _id: oid(id) }, next, { new: true });
  return ok(serialize(updated?.toObject ? updated.toObject() : updated), 'فروشگاه ویرایش شد');
}

export async function deleteStore(id: string): Promise<ActionResult> {
  const access = await withWorkspace();
  if ('error' in access) return access.error;
  const expired = denyExpired(access.session);
  if (expired) return expired;
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
  const expired = denyExpired(access.session);
  if (expired) return expired;
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
  const warehouseId = String(payload._warehouseId || '');
  if (warehouseId) {
    const warehouses = Array.isArray(store.warehouses) ? store.warehouses : [];
    if (!warehouses.some((row: any) => String(row._id) === warehouseId)) {
      return fail('انبار انتخاب‌شده در این فروشگاه نیست');
    }
  }
  const existing = await M().StoreMember.findOne({ _storeId: store._id, phonenumber, isDeleted: false }).lean();
  if (existing) return fail('این شماره قبلاً به فروشگاه اضافه شده است');
  const user = await M().User.findOne({ phonenumber }).lean();
  const member = await M().StoreMember.create({
    _brandId: store._brandId,
    _storeId: store._id,
    _warehouseId: warehouseId,
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
  const expired = denyExpired(access.session);
  if (expired) return expired;
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
  if (payload._warehouseId != null) {
    const warehouseId = String(payload._warehouseId || '');
    if (warehouseId) {
      const store = await M().Store.findOne({ _id: member._storeId, isDeleted: false }).lean();
      const warehouses = Array.isArray(store?.warehouses) ? store.warehouses : [];
      if (!warehouses.some((row: any) => String(row._id) === warehouseId)) {
        return fail('انبار انتخاب‌شده در این فروشگاه نیست');
      }
    }
    next._warehouseId = warehouseId;
  }
  const updated = await M().StoreMember.findOneAndUpdate({ _id: oid(id) }, next, { new: true });
  return ok(serialize(updated?.toObject ? updated.toObject() : updated), 'همکار ویرایش شد');
}

export async function removeStoreMember(id: string): Promise<ActionResult> {
  const access = await withWorkspace();
  if ('error' in access) return access.error;
  const expired = denyExpired(access.session);
  if (expired) return expired;
  const member = await M().StoreMember.findOne({ _id: oid(id), isDeleted: false }).lean();
  if (!member) return fail('همکار پیدا نشد', 404);
  const owned = String((await M().Brand.findOne({ _id: member._brandId }).lean())?._userId) === access.session._id;
  const adminHere = access.session.storeRole === 'admin' && access.session._storeId === String(member._storeId);
  if (!owned && !adminHere && !access.session.isPlatformAdmin) return fail('اجازه حذف این همکار را ندارید', 403);
  await M().StoreMember.updateOne({ _id: oid(id) }, { isDeleted: true });
  return ok(null, 'همکار حذف شد');
}

function partnerView(row: any) {
  return {
    _id: String(row._id),
    _userId: idOf(row._userId),
    name: row.name || '',
    phonenumber: row.phonenumber || '',
    sharePercent: Number(row.sharePercent || 0),
    allStores: Boolean(row.allStores),
    _brandIds: partnerBrandIds(row),
    _storeIds: partnerStoreIds(row),
  };
}

function toIdArray(value: unknown) {
  return idList(value).map((id) => oid(id)).filter(Boolean);
}

function parsePartnerScope(payload: Record<string, unknown>, current?: any) {
  const brandIds = payload._brandIds != null ? idList(payload._brandIds) : current ? partnerBrandIds(current) : [];
  const storeIds = payload._storeIds != null ? idList(payload._storeIds) : current ? partnerStoreIds(current) : [];
  const allStores =
    payload.allStores != null ? Boolean(payload.allStores) : Boolean(current?.allStores) && !storeIds.length;
  if (allStores && !storeIds.length) return { allStores: true, brandIds, storeIds: [] as string[] };
  return { allStores: false, brandIds, storeIds };
}

async function assertCanSavePartner(session: Session, scope: { allStores: boolean; brandIds: string[]; storeIds: string[] }) {
  if (session.isPlatformAdmin) return null;
  if (scope.allStores) {
    const owned = await M().Brand.findOne({ _userId: oid(session._id), isDeleted: false }).lean();
    if (!owned) return fail('فقط صاحب برند می‌تواند شریک همه فروشگاه‌ها را ثبت کند', 403);
    return null;
  }
  if (!scope.brandIds.length && !scope.storeIds.length) return fail('محدوده شریک را انتخاب کنید');
  for (const brandId of scope.brandIds) {
    const owned = await requireBrandOwner(session, brandId);
    if ('error' in owned) return owned.error;
  }
  for (const storeId of scope.storeIds) {
    const store = await M().Store.findOne({ _id: oid(storeId), isDeleted: false }).lean();
    if (!store) return fail('فروشگاه پیدا نشد', 404);
    const brandOwner = String((await M().Brand.findOne({ _id: store._brandId }).lean())?._userId) === session._id;
    const adminHere =
      session.storeRole === 'admin' &&
      session._storeId === storeId &&
      scope.storeIds.every((id) => id === session._storeId);
    if (!brandOwner && !adminHere && !hasGranted(session, 'partners.write')) {
      return fail('اجازه تعیین شریک برای این فروشگاه را ندارید', 403);
    }
  }
  return null;
}

async function shareConflict(
  session: Session,
  next: { _id?: string; allStores: boolean; brandIds: string[]; storeIds: string[]; sharePercent: number },
) {
  const percent = Math.max(0, Number(next.sharePercent || 0));
  if (percent > 100) return 'درصد سهم نمی‌تواند بیشتر از ۱۰۰ باشد';
  const { ownedBrands, stores } = await accessibleStores(session._id, session.phonenumber);
  const ownedBrandIds = new Set(ownedBrands.map((brand: any) => String(brand._id)));
  const draft = { _id: 'next', name: '', allStores: next.allStores, _brandIds: next.brandIds, _storeIds: next.storeIds };
  const affected = (next.allStores ? stores.filter((store: any) => ownedBrandIds.has(idOf(store._brandId))) : stores).filter(
    (store: any) => partnerAppliesToStore(draft, String(store._id), idOf(store._brandId)),
  );
  if (!affected.length) return null;
  const ownerIds = [...new Set([...ownedBrands.map((brand: any) => idOf(brand._userId)), session._id].filter(Boolean))].map(
    (id) => oid(id),
  );
  const brandOids = [...ownedBrandIds].map((id) => oid(id));
  const storeOids = affected.map((store: any) => store._id);
  const others = (
    await M()
      .Partner.find({
        isDeleted: false,
        $or: [
          { _userId: { $in: ownerIds } },
          { _brandIds: { $in: brandOids } },
          { _storeIds: { $in: storeOids } },
          { _brandId: { $in: brandOids } },
          { _storeId: { $in: storeOids } },
        ],
      })
      .lean()
  ).filter((row: any) => String(row._id) !== String(next._id || ''));
  for (const store of affected) {
    const applicable = others.filter((row: any) => partnerAppliesToStore(row, String(store._id), idOf(store._brandId)));
    const sum = sharePercentTotal(applicable) + percent;
    if (sum > 100) return `جمع درصد شرکا در «${store.name || 'فروشگاه'}» بیشتر از ۱۰۰ می‌شود (${sum}٪)`;
  }
  return null;
}

export async function listPartners(): Promise<ActionResult> {
  const access = await withWorkspace();
  if ('error' in access) return access.error;
  const { ownedBrands, stores } = await accessibleStores(access.session._id, access.session.phonenumber);
  const brandIds = [
    ...new Set([...ownedBrands.map((brand: any) => String(brand._id)), ...stores.map((store: any) => idOf(store._brandId))]),
  ]
    .filter(Boolean)
    .map((id) => oid(id));
  const storeIds = stores.map((store: any) => store._id);
  const ownerIds = [
    ...new Set(ownedBrands.map((brand: any) => idOf(brand._userId)).filter(Boolean)),
    access.session._id,
  ].map((id) => oid(id));
  const rows = await M()
    .Partner.find({
      isDeleted: false,
      $or: [
        { _userId: { $in: ownerIds } },
        { _brandIds: { $in: brandIds } },
        { _storeIds: { $in: storeIds } },
        { _brandId: { $in: brandIds } },
        { _storeId: { $in: storeIds } },
      ],
    })
    .sort('name')
    .lean();
  return ok(serialize(rows.map(partnerView)));
}

export async function createPartner(payload: Record<string, unknown>): Promise<ActionResult> {
  const access = await withWorkspace();
  if ('error' in access) return access.error;
  const limited = await assertPlanLimits(access.session, 'partner');
  if (limited) return limited;
  const scope = parsePartnerScope(payload);
  const denied = await assertCanSavePartner(access.session, scope);
  if (denied) return denied;
  const name = String(payload.name || '').trim();
  if (!name) return fail('نام شریک الزامی است');
  const sharePercent = Math.max(0, Number(payload.sharePercent || 0));
  if (Number.isNaN(sharePercent)) return fail('درصد سهم نامعتبر است');
  const conflict = await shareConflict(access.session, { ...scope, sharePercent });
  if (conflict) return fail(conflict);
  const partner = await M().Partner.create({
    _userId: oid(access.session._id),
    allStores: scope.allStores,
    _brandIds: toIdArray(scope.brandIds),
    _storeIds: toIdArray(scope.storeIds),
    _brandId: scope.brandIds[0] ? oid(scope.brandIds[0]) : null,
    _storeId: scope.storeIds[0] ? oid(scope.storeIds[0]) : null,
    name,
    phonenumber: String(payload.phonenumber || '').trim(),
    sharePercent,
    isDeleted: false,
  });
  return ok(serialize(partnerView(partner.toObject ? partner.toObject() : partner)), 'شریک اضافه شد');
}

export async function updatePartner(id: string, payload: Record<string, unknown>): Promise<ActionResult> {
  const access = await withWorkspace();
  if ('error' in access) return access.error;
  const expired = denyExpired(access.session);
  if (expired) return expired;
  const partner = await M().Partner.findOne({ _id: oid(id), isDeleted: false }).lean();
  if (!partner) return fail('شریک پیدا نشد', 404);
  const scope = parsePartnerScope(payload, partner);
  const denied = await assertCanSavePartner(access.session, scope);
  if (denied) return denied;
  const next: Record<string, unknown> = {
    allStores: scope.allStores,
    _brandIds: toIdArray(scope.brandIds),
    _storeIds: toIdArray(scope.storeIds),
    _brandId: scope.brandIds[0] ? oid(scope.brandIds[0]) : null,
    _storeId: scope.storeIds[0] ? oid(scope.storeIds[0]) : null,
  };
  if (payload.name != null) {
    const name = String(payload.name).trim();
    if (!name) return fail('نام شریک الزامی است');
    next.name = name;
  }
  if (payload.phonenumber != null) next.phonenumber = String(payload.phonenumber).trim();
  if (payload.sharePercent != null) {
    const sharePercent = Math.max(0, Number(payload.sharePercent));
    if (Number.isNaN(sharePercent)) return fail('درصد سهم نامعتبر است');
    next.sharePercent = sharePercent;
  }
  const conflict = await shareConflict(access.session, {
    _id: id,
    ...scope,
    sharePercent: Number(next.sharePercent ?? partner.sharePercent ?? 0),
  });
  if (conflict) return fail(conflict);
  const updated = await M().Partner.findOneAndUpdate({ _id: oid(id) }, next, { new: true });
  return ok(serialize(partnerView(updated?.toObject ? updated.toObject() : updated)), 'شریک ویرایش شد');
}

export async function deletePartner(id: string): Promise<ActionResult> {
  const access = await withWorkspace();
  if ('error' in access) return access.error;
  const expired = denyExpired(access.session);
  if (expired) return expired;
  const partner = await M().Partner.findOne({ _id: oid(id), isDeleted: false }).lean();
  if (!partner) return fail('شریک پیدا نشد', 404);
  const denied = await assertCanSavePartner(access.session, parsePartnerScope({}, partner));
  if (denied) return denied;
  await M().Partner.updateOne({ _id: oid(id) }, { isDeleted: true });
  await M().Cloth.updateMany({ _partner: oid(id) }, { _partner: null });
  return ok(null, 'شریک حذف شد');
}
