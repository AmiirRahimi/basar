import { randomBytes } from 'node:crypto';
import mongoose from 'mongoose';
import { PHONE_RE } from '@/lib/constants';
import { sanitizePermissions } from '@/lib/permissions';
import type { TeamInvite, TeamMember, WorkspaceTeam } from '@/lib/types';
import { db, dbEngine, serialize } from './db';
import { fileModels } from './file-db';
import * as mongo from './models';
import { fail, ok, type ActionResult } from './result';
import { requireSession, type Session } from './session';
import { publicAppOrigin, sendSmsText } from './sms';

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

export function isSuperuserPhone(phonenumber: string) {
  return Boolean(process.env.ADMIN_PHONENUMBER) && phonenumber === process.env.ADMIN_PHONENUMBER;
}

function idList(value: unknown) {
  const raw = Array.isArray(value) ? value : value ? [value] : [];
  return [...new Set(raw.map((item) => String(item || '').trim()).filter(Boolean))];
}

export function teamCoversStore(team: { _brandIds?: unknown; _storeIds?: unknown }, storeId: string, brandId: string) {
  const storeIds = idList(team._storeIds);
  const brandIds = idList(team._brandIds);
  if (storeId && storeIds.includes(storeId)) return true;
  if (brandId && brandIds.includes(brandId)) return true;
  return false;
}

function memberScope(member: any, team?: any) {
  const brandIds = idList(member?._brandIds);
  const storeIds = idList(member?._storeIds);
  if (brandIds.length || storeIds.length) return { _brandIds: brandIds, _storeIds: storeIds };
  return { _brandIds: idList(team?._brandIds), _storeIds: idList(team?._storeIds) };
}

export function memberCoversStore(member: any, team: any, storeId: string, brandId: string) {
  return teamCoversStore(memberScope(member, team), storeId, brandId);
}

function newInviteToken() {
  return randomBytes(16).toString('hex');
}

async function inviteLinkFor(token: string) {
  const origin = await publicAppOrigin();
  if (!origin || !token) return '';
  return `${origin}/counting/invite/${token}`;
}

export async function activateTeamMemberships(userId: string, phonenumber: string) {
  const rows = await M().TeamMember.find({ phonenumber, isDeleted: false }).lean();
  for (const row of rows) {
    await M().TeamMember.updateOne({ _id: row._id }, { _userId: oid(userId) });
  }
}

export async function acceptedTeamRows(userId: string, phonenumber: string) {
  const members = await M()
    .TeamMember.find({
      isDeleted: false,
      status: 'accepted',
      $or: [{ _userId: oid(userId) }, { phonenumber }],
    })
    .lean();
  const teamIds = members.map((row: any) => row._teamId).filter(Boolean);
  const teams = teamIds.length
    ? await M().Team.find({ _id: { $in: teamIds }, isDeleted: false }).lean()
    : [];
  const teamById = new Map(teams.map((team: any) => [String(team._id), team]));
  return { members, teams: teams as any[], teamById };
}

export async function storesForTeams(teams: any[], members: any[] = []) {
  const brandIds = [
    ...new Set([
      ...teams.flatMap((team) => idList(team._brandIds)),
      ...members.flatMap((row) => idList(row._brandIds)),
    ]),
  ];
  const storeIds = [
    ...new Set([
      ...teams.flatMap((team) => idList(team._storeIds)),
      ...members.flatMap((row) => idList(row._storeIds)),
    ]),
  ];
  const fromBrands = brandIds.length
    ? await M().Store.find({ _brandId: { $in: brandIds.map((id) => oid(id)) }, isDeleted: false }).lean()
    : [];
  const fromStores = storeIds.length
    ? await M().Store.find({ _id: { $in: storeIds.map((id) => oid(id)) }, isDeleted: false }).lean()
    : [];
  const byId = new Map<string, any>();
  for (const store of [...fromBrands, ...fromStores]) byId.set(String(store._id), store);
  return [...byId.values()];
}

export function permissionsForStore(
  members: any[],
  teamById: Map<string, any>,
  storeId: string,
  brandId: string,
) {
  const next = new Set<string>();
  for (const member of members) {
    const team = teamById.get(String(member._teamId));
    if (!memberCoversStore(member, team, storeId, brandId)) continue;
    for (const id of sanitizePermissions(member.permissions)) next.add(id);
  }
  return [...next];
}

function inviteView(row: any, team: any, ownerName = '', brands: any[] = [], stores: any[] = [], inviteLink = ''): TeamInvite {
  const scope = memberScope(row, team);
  return {
    _id: String(row._id),
    teamId: idOf(row._teamId),
    teamName: team?.name || row.fullName || 'همکار',
    ownerName,
    brandNames: brands.filter((brand) => scope._brandIds.includes(String(brand._id))).map((brand) => brand.name || 'برند'),
    storeNames: stores.filter((store) => scope._storeIds.includes(String(store._id))).map((store) => store.name || 'فروشگاه'),
    permissions: sanitizePermissions(row.permissions),
    status: row.status,
    invitedAt: row.timeStamp,
    inviteLink,
  };
}

function memberView(row: any, inviteLink = ''): TeamMember {
  return {
    _id: String(row._id),
    phonenumber: String(row.phonenumber || ''),
    fullName: row.fullName || '',
    address: row.address || '',
    birthdate: row.birthdate || '',
    postalCode: row.postalCode || '',
    permissions: sanitizePermissions(row.permissions),
    status: row.status as 'pending' | 'accepted' | 'declined',
    _brandIds: idList(row._brandIds),
    _storeIds: idList(row._storeIds),
    inviteToken: row.inviteToken || '',
    inviteLink,
  };
}

function teamView(team: any, members: ReturnType<typeof memberView>[] = []): WorkspaceTeam {
  return {
    _id: String(team._id),
    name: team.name || 'تیم',
    _brandIds: idList(team._brandIds),
    _storeIds: idList(team._storeIds),
    members,
  };
}

async function loadScopeNames(rows: any[], teams: any[] = []) {
  const brandIds = [
    ...new Set([
      ...rows.flatMap((row) => idList(row._brandIds)),
      ...teams.flatMap((team) => idList(team._brandIds)),
    ]),
  ];
  const storeIds = [
    ...new Set([
      ...rows.flatMap((row) => idList(row._storeIds)),
      ...teams.flatMap((team) => idList(team._storeIds)),
    ]),
  ];
  const brands = brandIds.length
    ? await M().Brand.find({ _id: { $in: brandIds.map((id) => oid(id)) } }).lean()
    : [];
  const stores = storeIds.length
    ? await M().Store.find({ _id: { $in: storeIds.map((id) => oid(id)) } }).lean()
    : [];
  return { brands, stores };
}

export async function pendingInvitesFor(userId: string, phonenumber: string): Promise<TeamInvite[]> {
  const rows = await M()
    .TeamMember.find({
      isDeleted: false,
      status: 'pending',
      $or: [{ _userId: oid(userId) }, { phonenumber }],
    })
    .lean();
  if (!rows.length) return [];
  const teams = await M()
    .Team.find({ _id: { $in: rows.map((row: any) => row._teamId).filter(Boolean) }, isDeleted: false })
    .lean();
  const teamById = new Map(teams.map((team: any) => [String(team._id), team]));
  const ownerIds = [
    ...new Set([
      ...teams.map((team: any) => idOf(team._userId)),
      ...rows.map((row: any) => idOf(row.invitedBy)),
    ].filter(Boolean)),
  ];
  const owners = ownerIds.length
    ? await M()
        .User.find({ _id: { $in: ownerIds.map((id) => oid(id)) } })
        .select('_id fullName')
        .lean()
    : [];
  const ownerName = new Map(owners.map((user: any) => [String(user._id), user.fullName || '']));
  const { brands, stores } = await loadScopeNames(rows, teams);
  const origin = await publicAppOrigin();
  return rows.map((row: any) => {
    const team = teamById.get(String(row._teamId));
    const ownerId = idOf(row.invitedBy) || idOf(team?._userId);
    const link = row.inviteToken && origin ? `${origin}/counting/invite/${row.inviteToken}` : '';
    return inviteView(row, team, ownerName.get(ownerId) || '', brands, stores, link);
  });
}

export async function ownedPeopleFor(userId: string): Promise<TeamMember[]> {
  const members = await M()
    .TeamMember.find({ invitedBy: oid(userId), isDeleted: false })
    .sort('-timeStamp')
    .lean();
  const origin = await publicAppOrigin();
  return members.map((row: any) =>
    memberView(row, row.inviteToken && origin ? `${origin}/counting/invite/${row.inviteToken}` : ''),
  );
}

export async function ownedTeamsFor(userId: string): Promise<WorkspaceTeam[]> {
  const teams = await M().Team.find({ _userId: oid(userId), isDeleted: false }).sort('name').lean();
  if (!teams.length) return [];
  const members = await M()
    .TeamMember.find({ _teamId: { $in: teams.map((team: any) => team._id) }, isDeleted: false })
    .lean();
  const byTeam = new Map<string, TeamMember[]>();
  for (const member of members) {
    const key = idOf(member._teamId);
    const list = byTeam.get(key) || [];
    list.push(memberView(member));
    byTeam.set(key, list);
  }
  return teams.map((team: any) => teamView(team, byTeam.get(String(team._id)) || []));
}

async function requireOwnerSession() {
  await db();
  const auth = await requireSession();
  if ('error' in auth) return { error: auth.error as ActionResult };
  const session = auth.session;
  if (isSuperuserPhone(session.phonenumber)) {
    return { session: { ...session, isPlatformAdmin: true, isSuperuser: true } };
  }
  const owned = await M().Brand.findOne({ _userId: oid(session._id), isDeleted: false }).lean();
  if (!owned) return { error: fail('فقط صاحب برند یا فروشگاه می‌تواند فرد اضافه کند', 403) as ActionResult };
  return { session };
}

async function assertOwnedScope(session: Session, brandIds: string[], storeIds: string[]) {
  if (isSuperuserPhone(session.phonenumber)) return null;
  if (!brandIds.length && !storeIds.length) return fail('حداقل یک برند یا فروشگاه انتخاب کنید');
  for (const brandId of brandIds) {
    const brand = await M().Brand.findOne({ _id: oid(brandId), isDeleted: false }).lean();
    if (!brand) return fail('برند پیدا نشد', 404);
    if (String(brand._userId) !== session._id) return fail('فقط برندهای خودتان را می‌توانید به تیم بدهید', 403);
  }
  for (const storeId of storeIds) {
    const store = await M().Store.findOne({ _id: oid(storeId), isDeleted: false }).lean();
    if (!store) return fail('فروشگاه پیدا نشد', 404);
    const brand = await M().Brand.findOne({ _id: store._brandId, isDeleted: false }).lean();
    if (!brand || String(brand._userId) !== session._id) {
      return fail('فقط فروشگاه‌های خودتان را می‌توانید به تیم بدهید', 403);
    }
  }
  return null;
}

async function requireOwnedTeam(session: Session, teamId: string) {
  const team = await M().Team.findOne({ _id: oid(teamId), isDeleted: false }).lean();
  if (!team) return { error: fail('تیم پیدا نشد', 404) };
  if (String(team._userId) !== session._id && !isSuperuserPhone(session.phonenumber)) {
    return { error: fail('اجازه مدیریت این تیم را ندارید', 403) };
  }
  return { team };
}

async function requireOwnedPerson(session: Session, id: string) {
  const member = await M().TeamMember.findOne({ _id: oid(id), isDeleted: false }).lean();
  if (!member) return { error: fail('شخص پیدا نشد', 404) };
  const invited = idOf(member.invitedBy) === session._id;
  if (invited || isSuperuserPhone(session.phonenumber)) return { member };
  if (member._teamId) {
    const owned = await requireOwnedTeam(session, idOf(member._teamId));
    if (!('error' in owned)) return { member };
  }
  return { error: fail('اجازه مدیریت این شخص را ندارید', 403) };
}

export async function createTeam(payload: Record<string, unknown>): Promise<ActionResult> {
  const access = await requireOwnerSession();
  if ('error' in access) return access.error;
  const name = String(payload.name || '').trim();
  if (!name) return fail('نام تیم را وارد کنید');
  const brandIds = idList(payload._brandIds);
  const storeIds = idList(payload._storeIds);
  const scope = await assertOwnedScope(access.session, brandIds, storeIds);
  if (scope) return scope;
  const team = await M().Team.create({
    _userId: oid(access.session._id),
    name,
    _brandIds: brandIds.map((id) => oid(id)),
    _storeIds: storeIds.map((id) => oid(id)),
    isDeleted: false,
  });
  return ok(serialize(team.toObject ? team.toObject() : team), 'تیم ساخته شد');
}

export async function updateTeam(id: string, payload: Record<string, unknown>): Promise<ActionResult> {
  const access = await requireOwnerSession();
  if ('error' in access) return access.error;
  const owned = await requireOwnedTeam(access.session, id);
  if ('error' in owned) return owned.error;
  const next: Record<string, unknown> = {};
  if (payload.name != null) {
    const name = String(payload.name || '').trim();
    if (!name) return fail('نام تیم را وارد کنید');
    next.name = name;
  }
  if (payload._brandIds != null || payload._storeIds != null) {
    const brandIds = payload._brandIds != null ? idList(payload._brandIds) : idList(owned.team._brandIds);
    const storeIds = payload._storeIds != null ? idList(payload._storeIds) : idList(owned.team._storeIds);
    const scope = await assertOwnedScope(access.session, brandIds, storeIds);
    if (scope) return scope;
    next._brandIds = brandIds.map((item) => oid(item));
    next._storeIds = storeIds.map((item) => oid(item));
  }
  const updated = await M().Team.findOneAndUpdate({ _id: oid(id) }, next, { new: true });
  return ok(serialize(updated?.toObject ? updated.toObject() : updated), 'تیم ذخیره شد');
}

export async function deleteTeam(id: string): Promise<ActionResult> {
  const access = await requireOwnerSession();
  if ('error' in access) return access.error;
  const owned = await requireOwnedTeam(access.session, id);
  if ('error' in owned) return owned.error;
  await M().Team.updateOne({ _id: oid(id) }, { isDeleted: true });
  await M().TeamMember.updateMany({ _teamId: oid(id) }, { isDeleted: true });
  return ok(null, 'تیم حذف شد');
}

async function sendInviteSms(input: {
  phone: string;
  ownerName: string;
  brandNames: string[];
  storeNames: string[];
  link: string;
}) {
  const places = [...input.storeNames, ...input.brandNames].filter(Boolean).join('، ');
  const where = places ? `فروشگاه ${places}` : 'فروشگاه خود';
  const text = [
    `${input.ownerName || 'صاحب فروشگاه'} شما را به ${where} دعوت کرد.`,
    input.link ? `لینک دعوت:\n${input.link}` : '',
    'پس از ورود، همین دعوت در پنل شما نمایش داده می‌شود.',
  ]
    .filter(Boolean)
    .join('\n');
  return sendSmsText(input.phone, text);
}

export async function addTeamPerson(payload: Record<string, unknown>): Promise<ActionResult> {
  const access = await requireOwnerSession();
  if ('error' in access) return access.error;
  const fullName = String(payload.fullName || '').trim();
  if (!fullName) return fail('نام الزامی است');
  const phonenumber = String(payload.phonenumber || '').trim();
  if (!PHONE_RE.test(phonenumber)) return fail('شماره موبایل معتبر نیست');
  if (phonenumber === access.session.phonenumber) return fail('نمی‌توانید خودتان را اضافه کنید');
  const brandIds = idList(payload._brandIds);
  const storeIds = idList(payload._storeIds);
  const scope = await assertOwnedScope(access.session, brandIds, storeIds);
  if (scope) return scope;
  const permissions = sanitizePermissions(payload.permissions);
  if (!permissions.length) return fail('حداقل یک دسترسی انتخاب کنید');
  const existing = await M().TeamMember.findOne({
    invitedBy: oid(access.session._id),
    phonenumber,
    isDeleted: false,
  }).lean();
  if (existing) return fail('این شماره قبلاً اضافه شده است');
  const user = await M().User.findOne({ phonenumber }).lean();
  let team = await M().Team.findOne({ _userId: oid(access.session._id), name: 'همکاران', isDeleted: false }).lean();
  if (!team) {
    team = await M().Team.create({
      _userId: oid(access.session._id),
      name: 'همکاران',
      _brandIds: brandIds.map((id) => oid(id)),
      _storeIds: storeIds.map((id) => oid(id)),
      isDeleted: false,
    });
  }
  const member = await M().TeamMember.create({
    _teamId: team._id,
    phonenumber,
    _userId: user?._id || null,
    fullName,
    address: String(payload.address || '').trim(),
    birthdate: String(payload.birthdate || '').trim(),
    postalCode: String(payload.postalCode || '').trim(),
    permissions,
    _brandIds: brandIds.map((id) => oid(id)),
    _storeIds: storeIds.map((id) => oid(id)),
    inviteToken: newInviteToken(),
    status: 'pending',
    invitedBy: oid(access.session._id),
    isDeleted: false,
  });
  const link = await inviteLinkFor(member.inviteToken || '');
  return ok(
    serialize({ ...(member.toObject ? member.toObject() : member), inviteLink: link }),
    'شخص اضافه شد',
  );
}

export async function sendTeamInviteLink(id: string): Promise<ActionResult> {
  const access = await requireOwnerSession();
  if ('error' in access) return access.error;
  const owned = await requireOwnedPerson(access.session, id);
  if ('error' in owned) return owned.error;
  const token = owned.member.inviteToken || newInviteToken();
  if (!owned.member.inviteToken) {
    await M().TeamMember.updateOne({ _id: oid(id) }, { inviteToken: token });
  }
  const owner = await M().User.findById(access.session._id).select('fullName').lean();
  const { brands, stores } = await loadScopeNames([owned.member]);
  const link = await inviteLinkFor(token);
  const sms = await sendInviteSms({
    phone: String(owned.member.phonenumber),
    ownerName: owner?.fullName || '',
    brandNames: brands.map((brand: any) => brand.name || ''),
    storeNames: stores.map((store: any) => store.name || ''),
    link,
  });
  return ok({ inviteLink: link }, sms.ok ? 'لینک دعوت با پیامک ارسال شد' : 'لینک آماده است؛ ارسال پیامک ناموفق بود');
}

export async function getInviteByToken(token: string): Promise<ActionResult<TeamInvite>> {
  await db();
  const value = String(token || '').trim();
  if (!value) return fail('لینک دعوت نامعتبر است', 404);
  const row = await M().TeamMember.findOne({ inviteToken: value, isDeleted: false }).lean();
  if (!row) return fail('دعوت پیدا نشد', 404);
  const team = row._teamId ? await M().Team.findOne({ _id: row._teamId, isDeleted: false }).lean() : null;
  const owner = await M().User.findById(row.invitedBy || team?._userId).select('fullName').lean();
  const { brands, stores } = await loadScopeNames([row], team ? [team] : []);
  const link = await inviteLinkFor(value);
  return ok(inviteView(row, team, owner?.fullName || '', brands, stores, link));
}

export async function inviteTeamMember(payload: Record<string, unknown>): Promise<ActionResult> {
  return addTeamPerson(payload);
}

export async function updateTeamMember(id: string, payload: Record<string, unknown>): Promise<ActionResult> {
  const access = await requireOwnerSession();
  if ('error' in access) return access.error;
  const owned = await requireOwnedPerson(access.session, id);
  if ('error' in owned) return owned.error;
  const next: Record<string, unknown> = {};
  if (payload.fullName != null) {
    const fullName = String(payload.fullName || '').trim();
    if (!fullName) return fail('نام الزامی است');
    next.fullName = fullName;
  }
  if (payload.address != null) next.address = String(payload.address || '').trim();
  if (payload.birthdate != null) next.birthdate = String(payload.birthdate || '').trim();
  if (payload.postalCode != null) next.postalCode = String(payload.postalCode || '').trim();
  if (payload.permissions != null) {
    const permissions = sanitizePermissions(payload.permissions);
    if (!permissions.length) return fail('حداقل یک دسترسی انتخاب کنید');
    next.permissions = permissions;
  }
  if (payload._brandIds != null || payload._storeIds != null) {
    const brandIds = payload._brandIds != null ? idList(payload._brandIds) : idList(owned.member._brandIds);
    const storeIds = payload._storeIds != null ? idList(payload._storeIds) : idList(owned.member._storeIds);
    const scope = await assertOwnedScope(access.session, brandIds, storeIds);
    if (scope) return scope;
    next._brandIds = brandIds.map((item) => oid(item));
    next._storeIds = storeIds.map((item) => oid(item));
  }
  const updated = await M().TeamMember.findOneAndUpdate({ _id: oid(id) }, next, { new: true });
  return ok(serialize(updated?.toObject ? updated.toObject() : updated), 'شخص ذخیره شد');
}

export async function removeTeamMember(id: string): Promise<ActionResult> {
  const access = await requireOwnerSession();
  if ('error' in access) return access.error;
  const owned = await requireOwnedPerson(access.session, id);
  if ('error' in owned) return owned.error;
  await M().TeamMember.updateOne({ _id: oid(id) }, { isDeleted: true });
  return ok(null, 'شخص حذف شد');
}

export async function respondToTeamInvite(id: string, accept: boolean): Promise<ActionResult> {
  await db();
  const auth = await requireSession();
  if ('error' in auth) return auth.error;
  const member = await M().TeamMember.findOne({
    _id: oid(id),
    isDeleted: false,
    status: 'pending',
    $or: [{ _userId: oid(auth.session._id) }, { phonenumber: auth.session.phonenumber }],
  }).lean();
  if (!member) return fail('دعوت پیدا نشد', 404);
  await M().TeamMember.updateOne(
    { _id: oid(id) },
    {
      status: accept ? 'accepted' : 'declined',
      _userId: oid(auth.session._id),
      respondedAt: new Date(),
    },
  );
  return ok(null, accept ? 'به تیم پیوستید' : 'دعوت رد شد');
}

