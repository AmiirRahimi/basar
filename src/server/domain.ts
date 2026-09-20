import { randomBytes } from 'node:crypto';
import mongoose from 'mongoose';
import { fabricLotTotal, fabricUnitCost, clothFinishedUnitCost, clothPayTotal, clothUnitPrice } from '@/lib/cloth-price';
import { sanitizeClothExtras } from '@/lib/cloth-extras';
import { sanitizeFabricExtras } from '@/lib/fabric-extras';
import { parseGroupedNumber } from '@/lib/format';
import {
  addPacks,
  formatPacksFa,
  itemsToPacks,
  meetsWholesaleMoq,
  mergePacks,
  openingFromCloth,
  packsFromCloth,
  parsePacks,
  parsePacksEditorValue,
  subtractPacks,
  takeItemsAsPacks,
  totalItems,
  validatePacksEditor,
  type ClothPack,
} from '@/lib/packs';
import {
  compareSortValues,
  matchesTableSearch,
  parseListQuery,
  sortColumnValue,
  tableRowSearchExtra,
} from '@/lib/table-search';
import { DEFAULT_MOQ, isPayablePersonRole, normalizePersonRoles, personIsCustomer, personRoleLabel, personRolesLabel, PHONE_RE } from '@/lib/constants';
import { checkAvailableToTransfer, dueDateMonthKey, paymentApplied, PERSIAN_MONTHS, persianYearMonth, statusToFlags } from '@/lib/checks';
import { canAccessMenu, canReadResource, canWriteResource } from '@/lib/roles';
import { allocateIncome, partnersForStore } from '@/lib/partners';
import { clothAppliesToStore } from '@/lib/cloth-share';
import { db, dbEngine, serialize } from './db';
import { fileModels } from './file-db';
import * as mongo from './models';
import { clothImageLimitMessage, parseImageList } from '@/lib/shop-cart';
import { clampDiscountPercent, isTruthyFlag, saleState } from '@/lib/product-sale';
import { fail, failDb, ok, type ActionResult } from './result';
import type { PublicOrderSummary } from '@/lib/types';
import type { Session } from './session';
import { withWorkspace, accessibleStores } from './workspace';
import { denyPlanFeature, subscriptionForSession } from './subscription';
import { publicAppOrigin, sendSmsText, shareUrl } from './sms';
import { clampPage, MAX_LIST_SCAN } from './paging';
import { clientIp, rateLimit } from './rate-limit';

function M() {
  return dbEngine() === 'file' ? fileModels : mongo;
}

function oid(value: unknown) {
  if (value == null || value === '') return undefined;
  const s = String(value);
  return mongoose.Types.ObjectId.isValid(s) ? new mongoose.Types.ObjectId(s) : value;
}

const FILTER_KEYS = new Set([
  '_id',
  '_client',
  '_owner',
  '_mercer',
  '_tailor',
  '_returnedPerson',
  '_type',
  '_wash',
  '_trim',
  '_print',
  'role',
  'isSent',
  'direction',
  'code',
]);

const RESOURCE_FIELDS: Record<string, string[]> = {
  person: ['fullName', 'phoneNumber', 'address', 'city', 'role', 'sewingFee'],
  cloth: [
    '_type',
    '_style',
    '_size',
    '_color',
    'isProduced',
    'fromPastStock',
    '_tailor',
    '_producedFrom',
    '_boughtFrom',
    '_wash',
    '_trim',
    '_print',
    '_partner',
    '_storeId',
    '_storeIds',
    '_brandIds',
    'sellInAllStores',
    'amountUsed',
    'boughtFee',
    'tailorFee',
    'washFee',
    'trimFee',
    'printFee',
    'extras',
    'code',
    'count',
    'packSize',
    'packs',
    'description',
    'published',
    'images',
    'onSale',
    'discountPercent',
    'saleEndsAt',
    'newCollection',
  ],
  invoice: ['_client', 'receiverAddress', 'isSent'],
  'customer-cart': ['_invoice', '_cloth', 'count', 'packs', 'price'],
  check: [
    '_owner',
    '_sourceCheck',
    'direction',
    'dueDate',
    'amount',
    'series',
    'serialNumber',
    'sayadiNumber',
    'status',
    'isCashed',
    'isReturned',
    'isTransferred',
  ],
  fabric: ['_mercer', '_tailor', 'amount', 'priceForUnit', 'priceForShipingForUnit', 'discount', 'extras'],
  returned: ['_returnedPerson', 'description'],
  color: ['name'],
  size: ['name', '_clothKind'],
  'cloth-kind': ['name'],
  'cloth-style': ['name', '_clothKind'],
};

const NUMBER_FIELDS = new Set([
  'amount',
  'priceForUnit',
  'priceForShipingForUnit',
  'discount',
  'sewingFee',
  'amountUsed',
  'boughtFee',
  'tailorFee',
  'washFee',
  'trimFee',
  'printFee',
  'count',
  'packSize',
  'discountPercent',
  'price',
]);

function sanitizeFilter(filters: Record<string, unknown>) {
  const next: Record<string, unknown> = {};
  if (!filters || typeof filters !== 'object' || Array.isArray(filters)) return next;
  for (const [key, value] of Object.entries(filters)) {
    if (!FILTER_KEYS.has(key) || key.startsWith('$')) continue;
    if (value && typeof value === 'object') continue;
    next[key] = key.startsWith('_') || key === '_id' ? oid(value) : value;
  }
  return next;
}

function storeFilter(session: Session, extra: Record<string, unknown> = {}) {
  return { ...sanitizeFilter(extra), _storeId: oid(session._storeId), isDeleted: false };
}

function publicOrderToken() {
  return randomBytes(24).toString('base64url');
}

function pickAllowed(resource: string, payload: Record<string, unknown>) {
  const allowed = RESOURCE_FIELDS[resource];
  if (!allowed) return {};
  const next: Record<string, unknown> = {};
  for (const key of allowed) {
    if (payload[key] !== undefined) next[key] = payload[key];
  }
  return next;
}

function clothVisibleFilter(session: Session) {
  const storeId = oid(session._storeId);
  const brandId = oid(session._brandId);
  return {
    isDeleted: false,
    $or: [
      { sellInAllStores: true, _brandIds: brandId },
      { _storeIds: storeId },
      { _storeId: storeId },
      { $and: [{ _brandIds: brandId }, { _storeIds: { $size: 0 } }] },
      { $and: [{ _brandIds: brandId }, { _storeIds: { $exists: false } }] },
    ],
  };
}

async function withSession() {
  return withWorkspace();
}

const PLATFORM_WRITE = new Set(['color', 'size', 'cloth-kind', 'cloth-style', 'permision', 'change']);

function denyRead(session: Session, resource: string) {
  if (!canReadResource(session.storeRole, resource, session.isPlatformAdmin)) {
    return fail('اجازه این کار را ندارید', 403);
  }
  return null;
}

function denyMenu(session: Session, menuId: string) {
  if (!canAccessMenu(session.storeRole, menuId, session.isPlatformAdmin)) {
    return fail('اجازه این کار را ندارید', 403);
  }
  return null;
}

function denyWrite(session: Session, resource: string) {
  const read = denyRead(session, resource);
  if (read) return read;
  if (session.isPlatformAdmin) return null;
  if (PLATFORM_WRITE.has(resource)) {
    return fail('فقط ادمین اصلی می‌تواند این بخش را ویرایش کند', 403);
  }
  const subscriptionActive = session.subscriptionActive !== false;
  if (!subscriptionActive) {
    return fail('اشتراک تمام شده است. فقط مشاهده ممکن است.', 403);
  }
  if (!canWriteResource(session.storeRole, resource, session.isPlatformAdmin, subscriptionActive)) {
    return fail('اجازه این کار را ندارید', 403);
  }
  return null;
}

function lookups() {
  const m = M() as any;
  return {
    person: { model: m.Person, sort: 'fullName' },
    cloth: { model: m.Cloth, populate: mongo.CLOTH_POPULATE, sort: 'code' },
    invoice: {
      model: m.Invoice,
      populate: [
        { path: '_client', select: '_id fullName city role address phoneNumber' },
        { path: '_storeId', select: '_id name _brandId', populate: { path: '_brandId', select: '_id name color' } },
        { path: '_brandId', select: '_id name' },
      ],
      sort: '-timeStamp',
    },
    check: {
      model: m.Check,
      populate: [
        { path: '_owner', select: '_id fullName city address phoneNumber' },
        { path: '_sourceCheck', populate: { path: '_owner', select: '_id fullName' } },
      ],
      sort: 'dueDate',
    },
    fabric: {
      model: m.Fabric,
      populate: [
        { path: '_mercer', select: '_id fullName city address phoneNumber' },
        { path: '_tailor', select: '_id fullName city address phoneNumber' },
      ],
      sort: 'timeStamp',
    },
    returned: { model: m.Returned, populate: { path: '_returnedPerson', select: '_id fullName city address phoneNumber' }, sort: '-timeStamp' },
    color: { model: m.Color, global: true, sort: 'name' },
    size: { model: m.Size, populate: { path: '_clothKind' }, global: true, sort: 'name' },
    'cloth-kind': { model: m.ClothKind, global: true, sort: 'name' },
    'cloth-style': { model: m.ClothStyle, populate: { path: '_clothKind' }, global: true, sort: 'name' },
    change: { model: m.Change, sort: '-timeStamp' },
    permision: { model: m.Permision, global: true },
  } as Record<string, { model: any; populate?: any; sort?: string; global?: boolean }>;
}

function parseListExtra(extra = '') {
  return parseListQuery(extra);
}

function decorateListRow(resource: string, row: any) {
  if (resource === 'invoice') return decorateInvoice(row);
  if (resource === 'cloth') {
    const stock = packsFromCloth(row);
    return {
      ...row,
      unitPrice: clothUnitPrice(row),
      count: totalItems(stock.packs) || Number(row.count || 0),
      packSummary: formatPacksFa(stock.packs),
    };
  }
  if (resource === 'fabric') {
    return { ...row, totalPrice: fabricLotTotal(row) };
  }
  return row;
}

function defaultSortFromCfg(cfgSort?: string) {
  if (!cfgSort) return { key: '', desc: false };
  const desc = cfgSort.startsWith('-');
  return { key: desc ? cfgSort.slice(1) : cfgSort, desc };
}

function sortListRows(resource: string, rows: any[], key: string, desc: boolean) {
  if (!key) return rows;
  return [...rows].sort((a, b) => {
    const cmp = compareSortValues(sortColumnValue(a, key, resource), sortColumnValue(b, key, resource));
    if (cmp !== 0) return desc ? -cmp : cmp;
    return String(a?._id || '').localeCompare(String(b?._id || ''));
  });
}

async function markUsedChecks(session: Session, rows: any[]) {
  const ids = rows.map((row) => oid(row._id)).filter(Boolean);
  if (!ids.length) return rows;
  const payments = await M().Payment.find({
    _storeId: oid(session._storeId),
    isDeleted: false,
    $or: [{ _check: { $in: ids } }, { _checks: { $in: ids } }],
  }).lean();
  const used = new Set<string>();
  for (const payment of payments as any[]) {
    const single = relationKey(payment._check);
    if (single) used.add(single);
    for (const id of payment._checks || []) {
      const key = relationKey(id);
      if (key) used.add(key);
    }
  }
  return rows.map((row) => ({ ...row, isUsedInPayment: used.has(String(row._id)) }));
}

function decorateInvoice(row: any) {
  const store = row?._storeId;
  const brandFromStore = store && typeof store === 'object' ? store._brandId : null;
  const brand = brandFromStore && typeof brandFromStore === 'object' ? brandFromStore : row?._brandId;
  return {
    ...row,
    storeName: store && typeof store === 'object' ? store.name || '' : '',
    brandName: brand && typeof brand === 'object' ? brand.name || '' : '',
  };
}

export async function listResource(resource: string, page = 1, skip = 50, extra = ''): Promise<ActionResult> {
  try {
    const auth = await withSession();
    if ('error' in auth) return auth.error;
    const denied = denyRead(auth.session, resource);
    if (denied) return denied;
    const cfg = lookups()[resource];
    if (!cfg) return fail('منبع ناشناخته');
    const paging = clampPage(page, skip);
    const parsed = parseListExtra(extra);
    const filter = cfg.global
      ? {}
      : resource === 'cloth'
        ? clothVisibleFilter(auth.session)
        : storeFilter(auth.session, parsed.filter);
    let q = cfg.model.find(filter);
    if (cfg.populate) q = q.populate(cfg.populate);
    const scanned = await q.limit(MAX_LIST_SCAN).lean();
    let rows = (scanned as any[]).map((row) => decorateListRow(resource, row));
    if (resource === 'cloth') {
      rows = rows.filter((row) =>
        clothAppliesToStore(row, String(auth.session._storeId || ''), auth.session._brandId),
      );
    }
    if (parsed.q) {
      rows = rows.filter((row) =>
        matchesTableSearch(row, parsed.q, tableRowSearchExtra(resource, row), parsed.fields, resource),
      );
    }
    const fallback = defaultSortFromCfg(cfg.sort);
    const sortKey = parsed.sort || fallback.key;
    const desc = parsed.sort ? parsed.dir === 'desc' : fallback.desc;
    rows = sortListRows(resource, rows, sortKey, desc);
    const start = (paging.page - 1) * paging.skip;
    rows = rows.slice(start, start + paging.skip);
    if (resource === 'check') {
      return ok(serialize(await markUsedChecks(auth.session, rows)));
    }
    return ok(serialize(rows));
  } catch {
    return failDb();
  }
}

export async function getResource(resource: string, id: string): Promise<ActionResult> {
  const auth = await withSession();
  if ('error' in auth) return auth.error;
  const denied = denyRead(auth.session, resource === 'customer-cart' ? 'customer-cart' : resource);
  if (denied) return denied;
  if (resource === 'customer-cart') {
    const invoice = await M().Invoice.findOne(storeFilter(auth.session, { _id: id })).lean();
    if (!invoice) return fail('پیدا نشد', 404);
    const lines = await M().CustomerCart.find(storeFilter(auth.session, { _invoice: oid(id) }))
      .populate('_cloth')
      .lean();
    return ok(serialize(lines));
  }
  const cfg = lookups()[resource];
  if (!cfg) return fail('منبع ناشناخته');
  const filter = cfg.global
    ? { _id: id }
    : resource === 'cloth'
      ? { _id: id, ...clothVisibleFilter(auth.session) }
      : storeFilter(auth.session, { _id: id });
  let q = cfg.model.findOne(filter);
  if (cfg.populate) q = q.populate(cfg.populate);
  const row = await q.lean();
  if (!row) return fail('پیدا نشد', 404);
  return ok(serialize(resource === 'invoice' ? decorateInvoice(row) : row));
}

function convertIdList(value: unknown) {
  const raw = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(',').map((part) => part.trim()).filter(Boolean)
      : [];
  return raw.map((item) => oid(item)).filter(Boolean);
}

function preparePayload(session: Session, resource: string, payload: Record<string, unknown>) {
  const next = pickAllowed(resource, payload);
  Object.keys(next).forEach((key) => {
    if (!key.startsWith('_')) return;
    if (key === '_storeIds' || key === '_brandIds') {
      next[key] = convertIdList(next[key]);
      return;
    }
    const converted = oid(next[key]);
    if (converted === undefined) delete next[key];
    else next[key] = converted;
  });
  const cfg = lookups()[resource];
  if (!cfg?.global) {
    next._storeId = oid(session._storeId);
    if (session._brandId) next._brandId = oid(session._brandId);
    next.isDeleted = false;
  }
  for (const key of NUMBER_FIELDS) {
    if (next[key] !== undefined) next[key] = parseGroupedNumber(next[key]);
  }
  if (resource === 'fabric' && next.extras !== undefined) {
    next.extras = sanitizeFabricExtras(next.extras);
  }
  if (resource === 'person' && next.role !== undefined) {
    next.role = normalizePersonRoles(next.role);
  }
  return next;
}

async function applyClothShare(
  session: Session,
  body: Record<string, unknown>,
): Promise<ActionResult<Record<string, unknown> | null>> {
  const { stores } = await accessibleStores(session._id, session.phonenumber);
  const accessibleStoreIds = new Set(stores.map((row: any) => String(row._id)));
  const accessibleBrandIds = new Set(stores.map((row: any) => String(row._brandId || '')).filter(Boolean));
  const sellAll = isTruthyFlag(body.sellInAllStores);
  let brandIds = convertIdList(body._brandIds)
    .map((id) => String(id))
    .filter((id) => accessibleBrandIds.has(id));
  let storeIds = convertIdList(body._storeIds)
    .map((id) => String(id))
    .filter((id) => accessibleStoreIds.has(id));
  storeIds = storeIds.filter((id) => {
    const store = stores.find((row: any) => String(row._id) === id);
    return store && brandIds.includes(String(store._brandId || ''));
  });
  if (sellAll) {
    brandIds = [...accessibleBrandIds];
    storeIds = [];
    body.sellInAllStores = true;
  } else {
    body.sellInAllStores = Boolean(brandIds.length === accessibleBrandIds.size && accessibleBrandIds.size && !storeIds.length);
    if (!brandIds.length) {
      const fallback = String(session._brandId || '');
      if (fallback && accessibleBrandIds.has(fallback)) brandIds = [fallback];
      else if (accessibleBrandIds.size) brandIds = [[...accessibleBrandIds][0]];
    }
    if (!brandIds.length) return fail('حداقل یک برند را انتخاب کنید');
  }
  body._brandIds = brandIds.map((id) => oid(id));
  body._storeIds = storeIds.map((id) => oid(id));
  const originStore =
    storeIds[0] ||
    stores.find((row: any) => String(row._brandId || '') === brandIds[0])?._id ||
    session._storeId;
  body._storeId = oid(originStore);
  body._brandId = oid(brandIds[0] || session._brandId);
  return ok(body);
}

function applyClothInventory(body: Record<string, unknown>): ActionResult<Record<string, unknown> | null> {
  let packSize = Math.trunc(Number(body.packSize || 0));
  let packs = parsePacks(body.packs);
  if (typeof body.packs === 'string') {
    const editor = parsePacksEditorValue(body.packs);
    packs = mergePacks(editor.packs);
    if (!packSize) packSize = editor.packSize;
  }
  packs = mergePacks(packs);
  if (!packs.length && Number(body.count || 0) > 0) {
    packSize = packSize > 0 ? packSize : 1;
    packs = itemsToPacks(Number(body.count), packSize);
  }  
  const size = packSize > 0 ? packSize : Math.max(0, ...packs.map((pack) => pack.items));
  const invalid = validatePacksEditor({ packSize: size, packs });
  if (invalid) return fail(invalid);
  body.packSize = size;
  body.packs = packs;
  body.count = totalItems(packs);
  body.openingPacks = packs;
  body.openingCount = body.count;
  return applyClothShopFields(body);
}

/** Form packs = registered opening; keep current remaining in sync by the opening delta. */
function applyClothInventoryUpdate(
  body: Record<string, unknown>,
  previous: Record<string, unknown> | null,
): ActionResult<Record<string, unknown> | null> {
  const inventoried = applyClothInventory(body);
  if (!inventoried.ok) return inventoried;
  const next = inventoried.data || body;
  const newOpening = mergePacks(parsePacks(next.packs));
  const size = Number(next.packSize || 1);
  if (!previous) {
    next.openingPacks = newOpening;
    next.openingCount = totalItems(newOpening);
    next.packs = newOpening;
    next.count = totalItems(newOpening);
    return ok(next);
  }
  const prevOpening = openingFromCloth(previous).packs;
  const prevCurrent = packsFromCloth(previous).packs;
  const delta = totalItems(newOpening) - totalItems(prevOpening);
  let nextCurrent = prevCurrent;
  if (delta > 0) {
    nextCurrent = addPacks(prevCurrent, itemsToPacks(delta, size));
  } else if (delta < 0) {
    const taken = takeItemsAsPacks(prevCurrent, -delta, size);
    if (!taken) return fail('مانده فعلی کمتر از کاهش موجودی ثبت‌شده است');
    const reduced = subtractPacks(prevCurrent, taken);
    if (!reduced) return fail('مانده فعلی کمتر از کاهش موجودی ثبت‌شده است');
    nextCurrent = reduced;
  }
  next.openingPacks = newOpening;
  next.openingCount = totalItems(newOpening);
  next.packs = nextCurrent;
  next.count = totalItems(nextCurrent);
  return ok(next);
}

function applyClothShopFields(body: Record<string, unknown>): ActionResult<Record<string, unknown> | null> {
  if (body.images != null) {
    const images = parseImageList(body.images);
    const limitError = clothImageLimitMessage(images.length);
    if (limitError) return fail(limitError);
    body.images = images;
  }
  delete body.minOrderQty;
  delete body.wholesalePrice;
  if (body.extras !== undefined) {
    body.extras = sanitizeClothExtras(body.extras);
  }
  if (body.description != null) body.description = String(body.description || '').trim();
  if (body.onSale != null) body.onSale = isTruthyFlag(body.onSale);
  if (body.newCollection != null) body.newCollection = isTruthyFlag(body.newCollection);
  if (body.discountPercent != null && body.discountPercent !== '') {
    body.discountPercent = clampDiscountPercent(body.discountPercent);
  }
  if (body.saleEndsAt !== undefined) {
    if (!body.saleEndsAt) body.saleEndsAt = null;
    else {
      const ends = new Date(String(body.saleEndsAt));
      body.saleEndsAt = Number.isNaN(ends.getTime()) ? null : ends;
    }
  }
  if (body.onSale && !Number(body.discountPercent || 0)) {
    return fail('برای حراج، درصد تخفیف را وارد کنید');
  }
  if (body.published != null) body.published = isTruthyFlag(body.published);
  return ok(body);
}

function restrictClothPublish(session: Session, body: Record<string, unknown>, isCreate: boolean) {
  if (session.isPlatformAdmin) return;
  delete body.published;
  if (isCreate) body.published = false;
}

function linePacks(item: any, packSize: number): ClothPack[] {
  const packs = mergePacks(parsePacks(item?.packs));
  if (packs.length) return packs;
  return itemsToPacks(Number(item?.count || 0), packSize);
}

async function applyClothCost(session: Session, body: Record<string, unknown>) {
  const produced = body.isProduced === true || body.isProduced === 'true' || body.isProduced === 1;
  body.isProduced = Boolean(produced);
  if (!produced) {
    body._producedFrom = null;
    body._tailor = null;
    body._wash = null;
    body._trim = null;
    body._print = null;
    body.amountUsed = null;
    body.tailorFee = null;
    body.washFee = null;
    body.trimFee = null;
    body.printFee = null;
    const fromPast =
      body.fromPastStock === true || body.fromPastStock === 'true' || body.fromPastStock === 1;
    body.fromPastStock = Boolean(fromPast);
    if (fromPast) body._boughtFrom = null;
    return body;
  }
  body.fromPastStock = false;
  body._boughtFrom = null;
  const fabricId = body._producedFrom;
  const amountUsed = Number(body.amountUsed || 0);
  if (!fabricId || !amountUsed) return body;
  const fabric = await M().Fabric.findOne(storeFilter(session, { _id: fabricId })).lean();
  if (!fabric) return body;
  body.boughtFee = amountUsed * fabricUnitCost(fabric);
  return body;
}

function applyCheckFlags(body: Record<string, unknown>) {
  if (body.status) {
    Object.assign(body, statusToFlags(String(body.status)));
    delete body.status;
  }
  if (body.isReturned) body.isCashed = false;
  else if (body.isCashed) body.isReturned = false;
  if (body.direction !== 'out') body.direction = 'in';
  return body;
}

async function applyCheckPayload(session: Session, body: Record<string, unknown>, isCreate: boolean) {
  applyCheckFlags(body);
  if (!isCreate || !body._sourceCheck) return ok(body);
  const source = await M().Check.findOne(storeFilter(session, { _id: body._sourceCheck })).lean();
  if (!source || !checkAvailableToTransfer(source)) return fail('این چک قابل واگذاری نیست');
  body.direction = 'out';
  body.amount = source.amount;
  body.dueDate = source.dueDate;
  body.series = source.series;
  body.serialNumber = source.serialNumber;
  body.sayadiNumber = source.sayadiNumber;
  await M().Check.findOneAndUpdate({ _id: source._id, _storeId: oid(session._storeId) }, { isTransferred: true });
  return ok(body);
}

function lineClothId(item: any) {
  const value = item?._cloth;
  if (value && typeof value === 'object' && value && '_id' in value) return String(value._id);
  return String(value || '');
}

function clothSellsInStore(cloth: any, session: Session) {
  return clothAppliesToStore(cloth, String(session._storeId || ''), session._brandId);
}

async function writeStock(
  clothId: unknown,
  packs: ClothPack[],
  opening?: { packs: ClothPack[]; count: number },
) {
  const id = typeof clothId === 'object' && clothId && '_id' in (clothId as object) ? (clothId as { _id: unknown })._id : clothId;
  const update: Record<string, unknown> = { packs, count: totalItems(packs) };
  if (opening) {
    update.openingPacks = opening.packs;
    update.openingCount = opening.count;
  }
  await M().Cloth.updateOne({ _id: oid(id) }, update);
}

function clothHasOpening(cloth: { openingPacks?: unknown; openingCount?: unknown }) {
  return parsePacks(cloth.openingPacks).length > 0 || Number(cloth.openingCount || 0) > 0;
}

async function changeStock(clothId: unknown, delta: number) {
  const id = typeof clothId === 'object' && clothId && '_id' in (clothId as object) ? (clothId as { _id: unknown })._id : clothId;
  const cloth = await M().Cloth.findOne({ _id: oid(id), isDeleted: false }).lean();
  if (!cloth) return fail('لباس پیدا نشد');
  const stock = packsFromCloth(cloth);
  if (delta > 0) {
    await writeStock(cloth._id, addPacks(stock.packs, itemsToPacks(delta, stock.packSize)));
    return ok(null);
  }
  if (delta < 0) {
    const taken = takeItemsAsPacks(stock.packs, -delta, stock.packSize);
    if (!taken) return fail('موجودی این لباس کافی نیست');
    const next = subtractPacks(stock.packs, taken);
    if (!next) return fail('موجودی این لباس کافی نیست');
    await writeStock(cloth._id, next);
  }
  return ok(null);
}

async function sellItems(session: Session, items: any[]): Promise<ActionResult<any[]>> {
  const needed = new Map<string, ClothPack[]>();
  const prepared: any[] = [];
  for (const item of items) {
    const id = lineClothId(item);
    if (!id) continue;
    const cloth = await M().Cloth.findOne({ _id: oid(id), isDeleted: false }).lean();
    if (!cloth) return fail('لباس پیدا نشد');
    if (!clothSellsInStore(cloth, session)) return fail('این لباس در این فروشگاه قابل فروش نیست');
    const stock = packsFromCloth(cloth);
    const taken = linePacks(item, stock.packSize);
    if (!taken.length) return fail('حداقل یک بسته انتخاب کنید');
    prepared.push({ ...item, packs: taken, count: totalItems(taken) });
    needed.set(id, addPacks(needed.get(id) || [], taken));
  }
  const nextById = new Map<string, { packs: ClothPack[]; freezeOpening?: ClothPack[] }>();
  for (const [id, taken] of needed) {
    const cloth = await M().Cloth.findOne({ _id: oid(id), isDeleted: false }).lean();
    if (!cloth) return fail('لباس پیدا نشد');
    const stock = packsFromCloth(cloth);
    const next = subtractPacks(stock.packs, taken);
    if (!next) return fail('موجودی این لباس کافی نیست');
    nextById.set(id, {
      packs: next,
      freezeOpening: clothHasOpening(cloth) ? undefined : stock.packs,
    });
  }
  for (const [id, row] of nextById) {
    await writeStock(
      id,
      row.packs,
      row.freezeOpening
        ? { packs: row.freezeOpening, count: totalItems(row.freezeOpening) }
        : undefined,
    );
  }
  return ok(prepared);
}

async function restoreItems(items: any[]) {
  for (const item of items) {
    const id = lineClothId(item);
    if (!id) continue;
    const cloth = await M().Cloth.findOne({ _id: oid(id), isDeleted: false }).lean();
    if (!cloth) continue;
    const stock = packsFromCloth(cloth);
    const returned = linePacks(item, stock.packSize);
    await writeStock(cloth._id, addPacks(stock.packs, returned));
  }
}

export async function createResource(resource: string, payload: unknown): Promise<ActionResult> {
  const auth = await withSession();
  if ('error' in auth) return auth.error;
  const denied = denyWrite(auth.session, resource === 'customer-cart' ? 'customer-cart' : resource);
  if (denied) return denied;
  const body = (payload || {}) as Record<string, unknown>;

  if (resource === 'invoice') {
    const items = Array.isArray(body.items) ? body.items : [];
    const sold = await sellItems(auth.session, items);
    if (!sold.ok) return sold;
    const soldItems = sold.data || [];
    let invoiceNumber = Math.floor(10000 + Math.random() * 9000);
    while (await M().Invoice.exists({ invoiceNumber })) {
      invoiceNumber = Math.floor(10000 + Math.random() * 9000);
    }
    const created = await M().Invoice.create({
      ...preparePayload(auth.session, resource, { ...body, items: undefined }),
      invoiceNumber,
      publicToken: publicOrderToken(),
    });
    if (soldItems.length) {
      await M().CustomerCart.insertMany(
        soldItems.map((item: any) => ({
          ...preparePayload(auth.session, 'customer-cart', item),
          _invoice: created._id,
        })),
      );
    }
    await created.populate([
      { path: '_client', select: '_id fullName city role address phoneNumber' },
      { path: '_storeId', select: '_id name _brandId', populate: { path: '_brandId', select: '_id name color' } },
    ]);
    return ok(serialize(decorateInvoice(created.toObject ? created.toObject() : created)), 'ثبت شد');
  }

  if (resource === 'customer-cart') {
    const sold = await sellItems(auth.session, [body]);
    if (!sold.ok) return sold;
    const line = sold.data?.[0] || body;
    const created = await M().CustomerCart.create(preparePayload(auth.session, resource, line));
    await created.populate('_cloth');
    return ok(serialize(created.toObject ? created.toObject() : created), 'ثبت شد');
  }

  const cfg = lookups()[resource];
  if (!cfg) return fail('منبع ناشناخته');
  let next = preparePayload(auth.session, resource, body);
  if (resource === 'cloth') {
    const shared = await applyClothShare(auth.session, { ...next, sellInAllStores: body.sellInAllStores });
    if (!shared.ok) return shared;
    next = shared.data || next;
    const inventoried = applyClothInventory(next);
    if (!inventoried.ok) return inventoried;
    next = inventoried.data || next;
    restrictClothPublish(auth.session, next, true);
    next = await applyClothCost(auth.session, next);
  }
  if (resource === 'check') {
    const checked = await applyCheckPayload(auth.session, next, true);
    if (!checked.ok) return checked;
    next = (checked.data || next) as Record<string, unknown>;
  }
  const created = await cfg.model.create(next);
  if (cfg.populate) await created.populate(cfg.populate);
  if (resource === 'check') {
    await M().Change.create({
      _storeId: oid(auth.session._storeId),
      _user: oid(auth.session._id),
      entityName: 'check',
      changeType: 1,
      _changedItemId: created._id,
    });
  }
  if (resource === 'cloth') {
    void notifyCustomersOfNewCloth(auth.session, created);
  }
  return ok(serialize(created.toObject ? created.toObject() : created), 'ثبت شد');
}

export async function updateResource(resource: string, id: string, payload: unknown): Promise<ActionResult> {
  const auth = await withSession();
  if ('error' in auth) return auth.error;
  const denied = denyWrite(auth.session, resource === 'customer-cart' ? 'customer-cart' : resource);
  if (denied) return denied;
  const raw = (payload || {}) as Record<string, unknown>;

  if (resource === 'invoice') {
    const items = Array.isArray(raw.items) ? raw.items : null;
    const body = preparePayload(auth.session, resource, { ...raw, items: undefined });
    delete body._storeId;
    delete body.items;
    const filter = { _id: id, _storeId: oid(auth.session._storeId) };
    const updated = await M().Invoice.findOneAndUpdate(filter, body, { new: true });
    if (!updated) return fail('پیدا نشد', 404);
    if (items) {
      const previous = await M().CustomerCart.find(storeFilter(auth.session, { _invoice: oid(id) })).lean();
      await restoreItems(previous);
      const sold = await sellItems(auth.session, items.filter((item: any) => item && item._cloth));
      if (!sold.ok) {
        await sellItems(auth.session, previous);
        return sold;
      }
      await M().CustomerCart.updateMany(
        storeFilter(auth.session, { _invoice: oid(id) }),
        { isDeleted: true },
      );
      const validItems = sold.data || [];
      if (validItems.length) {
        await M().CustomerCart.insertMany(
          validItems.map((item: any) => ({
            ...preparePayload(auth.session, 'customer-cart', item),
            _invoice: oid(id),
          })),
        );
      }
    }
    await updated.populate([
      { path: '_client', select: '_id fullName city role address phoneNumber' },
      { path: '_storeId', select: '_id name _brandId', populate: { path: '_brandId', select: '_id name color' } },
    ]);
    return ok(serialize(decorateInvoice(updated.toObject ? updated.toObject() : updated)), 'ویرایش شد');
  }

  if (resource === 'customer-cart') {
    const previous = await M().CustomerCart.findOne({ _id: id, _storeId: oid(auth.session._storeId) }).lean();
    if (!previous) return fail('پیدا نشد', 404);
    await restoreItems([previous]);
    const nextLine = { ...previous, ...raw };
    const sold = await sellItems(auth.session, [nextLine]);
    if (!sold.ok) {
      await sellItems(auth.session, [previous]);
      return sold;
    }
    Object.assign(raw, sold.data?.[0] || {});
  }

  let body = preparePayload(auth.session, resource, raw);
  delete body._storeId;
  const cfg = resource === 'customer-cart' ? { model: M().CustomerCart, populate: { path: '_cloth' } } : lookups()[resource];
  if (!cfg) return fail('منبع ناشناخته');
  const filter =
    'global' in cfg && cfg.global
      ? { _id: id }
      : resource === 'cloth'
        ? { _id: id, ...clothVisibleFilter(auth.session) }
        : { _id: id, _storeId: oid(auth.session._storeId) };
  const previous = resource === 'cloth' ? await cfg.model.findOne(filter).lean() : null;
  if (resource === 'cloth') {
    const shared = await applyClothShare(auth.session, { ...body, sellInAllStores: raw.sellInAllStores, _brandIds: raw._brandIds, _storeIds: raw._storeIds });
    if (!shared.ok) return shared;
    body = shared.data || body;
    const inventoried = applyClothInventoryUpdate(body, previous as Record<string, unknown> | null);
    if (!inventoried.ok) return inventoried;
    body = inventoried.data || body;
    restrictClothPublish(auth.session, body, false);
    body = await applyClothCost(auth.session, body);
  }
  if (resource === 'check') {
    const checked = await applyCheckPayload(auth.session, body, false);
    if (!checked.ok) return checked;
    body = (checked.data || body) as Record<string, unknown>;
  }
  const updated = await cfg.model.findOneAndUpdate(filter, body, { new: true });
  if (!updated) return fail('پیدا نشد', 404);
  if (cfg.populate) await updated.populate(cfg.populate);
  if (
    resource === 'cloth' &&
    isTruthyFlag((updated as any).published) &&
    previous &&
    !isTruthyFlag((previous as any).published)
  ) {
    void notifyCustomersOfNewCloth(auth.session, updated);
  }
  return ok(serialize(updated.toObject ? updated.toObject() : updated), 'ویرایش شد');
}

export async function deleteResource(resource: string, id: string): Promise<ActionResult> {
  const auth = await withSession();
  if ('error' in auth) return auth.error;
  const denied = denyWrite(auth.session, resource === 'customer-cart' ? 'customer-cart' : resource);
  if (denied) return denied;
  if (resource === 'color' || resource === 'size' || resource === 'cloth-kind' || resource === 'cloth-style' || resource === 'permision') {
    const cfg = lookups()[resource];
    await cfg.model.findByIdAndDelete(id);
    return ok(null, 'حذف شد');
  }
  if (resource === 'invoice') {
    const invoice = await M().Invoice.findOne(storeFilter(auth.session, { _id: id })).lean();
    if (!invoice) return fail('پیدا نشد', 404);
    const lines = await M().CustomerCart.find(storeFilter(auth.session, { _invoice: oid(id) })).lean();
    const updated = await M().Invoice.findOneAndUpdate(storeFilter(auth.session, { _id: id }), { isDeleted: true }, { new: true });
    if (!updated) return fail('پیدا نشد', 404);
    await restoreItems(lines);
    await M().CustomerCart.updateMany(storeFilter(auth.session, { _invoice: oid(id) }), { isDeleted: true });
    return ok(null, 'حذف شد');
  }
  if (resource === 'customer-cart') {
    const line = await M().CustomerCart.findOne(storeFilter(auth.session, { _id: id })).lean();
    if (line && !line.isDeleted) await restoreItems([line]);
  }
  if (resource === 'returned') {
    const returned = await M().Returned.findOne(storeFilter(auth.session, { _id: id })).lean();
    if (!returned) return fail('پیدا نشد', 404);
    const items = await M().ReturnedItems.find({ _returned: oid(id), isDeleted: false }).lean();
    for (const item of items as any[]) {
      await changeStock(item._cloth, -Number(item.count || 0));
    }
    await M().Returned.findOneAndUpdate(storeFilter(auth.session, { _id: id }), { isDeleted: true });
    await M().ReturnedItems.updateMany({ _returned: oid(id) }, { isDeleted: true });
    return ok(null, 'حذف شد');
  }
  const cfg = resource === 'customer-cart' ? { model: M().CustomerCart } : lookups()[resource];
  if (!cfg) return fail('منبع ناشناخته');
  const filter = resource === 'cloth' ? { _id: id, ...clothVisibleFilter(auth.session) } : { _id: id, _storeId: oid(auth.session._storeId) };
  const updated = await cfg.model.findOneAndUpdate(filter, { isDeleted: true });
  if (resource === 'returned' && updated) {
    await M().ReturnedItems.updateMany({ _returned: oid(id) }, { isDeleted: true });
  }
  return ok(null, 'حذف شد');
}

const PUBLIC_CLOTH_POPULATE = [
  { path: '_type' },
  { path: '_style' },
  { path: '_color' },
  { path: '_size', select: '_id name' },
];

const PUBLIC_CLOTH_SELECT =
  '_id code count packSize packs description images onSale discountPercent saleEndsAt newCollection published _type _style _size _color _storeId';

async function loadPublicCloth(filter: Record<string, unknown>) {
  await db();
  const query: any = M().Cloth.findOne(filter);
  return query.select(PUBLIC_CLOTH_SELECT).populate(PUBLIC_CLOTH_POPULATE).lean();
}

export async function listPublicClothes(): Promise<ActionResult> {
  await db();
  const query: any = M().Cloth.find({ isDeleted: false, published: true });
  const rows = await query.select(PUBLIC_CLOTH_SELECT).populate(PUBLIC_CLOTH_POPULATE).sort('code').lean();
  const inStock = (Array.isArray(rows) ? rows : []).filter((row: any) => totalItems(packsFromCloth(row).packs) > 0);
  return ok(serialize(inStock));
}

export async function getPublicClothById(id: string): Promise<ActionResult> {
  const row = await loadPublicCloth({ _id: oid(id), isDeleted: false, published: true });
  if (!row) return fail('لباس پیدا نشد', 404);
  return ok(serialize(row));
}

export async function getShopClothById(id: string): Promise<ActionResult> {
  const row = await loadPublicCloth({ _id: oid(id), isDeleted: false });
  if (!row) return fail('لباس پیدا نشد', 404);
  return ok(serialize(row));
}

const MAX_SHARE_CLOTHES = 40;

function shareClothIds(value: unknown) {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const item of value) {
    const id = String(item?._id || item || '').trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return ids;
}

async function insertProductShare(session: Session, title: string, clothIds: string[]) {
  const token = publicOrderToken();
  const created = await M().ProductShare.create({
    token,
    title: title.trim().slice(0, 80),
    _clothIds: clothIds.map((id) => oid(id)),
    _storeId: oid(session._storeId),
    _brandId: oid(session._brandId),
    _userId: oid(session._id),
    isDeleted: false,
    timeStamp: new Date(),
  });
  return { token, created, clothIds };
}

export async function createProductShare(payload: {
  title?: string;
  clothIds: unknown;
  phone?: string;
}): Promise<ActionResult> {
  const access = await withWorkspace();
  if ('error' in access) return access.error;
  const denied = denyWrite(access.session, 'product-share');
  if (denied) return denied;
  const sub = await subscriptionForSession(access.session);
  const blocked = denyPlanFeature(sub, 'share');
  if (blocked) return blocked;
  const phone = String(payload.phone || '').trim();
  if (phone) {
    const smsBlocked = denyPlanFeature(sub, 'share-sms');
    if (smsBlocked) return smsBlocked;
  }
  const clothIds = shareClothIds(payload.clothIds);
  if (!clothIds.length) return fail('حداقل یک لباس انتخاب کنید');
  if (clothIds.length > MAX_SHARE_CLOTHES) return fail(`حداکثر ${MAX_SHARE_CLOTHES} لباس در هر لینک مجاز است`);
  await db();
  const clothes = await M()
    .Cloth.find({ _id: { $in: clothIds.map((id) => oid(id)) }, ...clothVisibleFilter(access.session) })
    .select('_id')
    .lean();
  const allowed = new Set((clothes as any[]).map((row) => String(row._id)));
  const kept = clothIds.filter((id) => allowed.has(id));
  if (!kept.length) return fail('لباس معتبری انتخاب نشده');
  const { token, created } = await insertProductShare(access.session, String(payload.title || ''), kept);
  let smsMessage = '';
  if (phone) {
    const sent = await dispatchShareSms(access.session, token, phone);
    if (!sent.ok) return fail(sent.message);
    smsMessage = sent.message;
  }
  return ok(
    serialize({
      _id: created._id,
      token,
      title: created.title,
      _clothIds: kept,
      clothCount: kept.length,
    }),
    smsMessage || 'لینک ساخته شد',
  );
}

export async function sendProductShareSms(payload: {
  shareId?: string;
  phone: string;
  message?: string;
}): Promise<ActionResult> {
  const access = await withWorkspace();
  if ('error' in access) return access.error;
  const denied = denyWrite(access.session, 'product-share');
  if (denied) return denied;
  const sub = await subscriptionForSession(access.session);
  const blocked = denyPlanFeature(sub, 'share-sms');
  if (blocked) return blocked;
  const phone = String(payload.phone || '').trim();
  await db();
  const row = await M().ProductShare.findOne({
    _id: oid(payload.shareId),
    _storeId: oid(access.session._storeId),
    isDeleted: false,
  }).lean();
  if (!row) return fail('لینک پیدا نشد', 404);
  const sent = await dispatchShareSms(access.session, String(row.token), phone, payload.message);
  if (!sent.ok) return fail(sent.message);
  return ok({ _id: String(row._id), token: row.token }, sent.message);
}

async function dispatchShareSms(session: Session, token: string, phone: string, message?: string) {
  if (!PHONE_RE.test(phone)) return { ok: false, message: 'شماره موبایل معتبر نیست' };
  const ip = await clientIp();
  if (
    !rateLimit(`share-sms:${session._storeId}:${phone}`, 8, 60 * 60 * 1000) ||
    !rateLimit(`share-sms-ip:${ip}`, 30, 60 * 60 * 1000)
  ) {
    return { ok: false, message: 'تعداد پیامک‌ها زیاد است. کمی بعد دوباره تلاش کنید' };
  }
  const origin = await publicAppOrigin();
  if (!origin) return { ok: false, message: 'آدرس سایت برای ساخت لینک مشخص نیست' };
  const url = shareUrl(token, origin);
  const custom = String(message || '').trim();
  const body = custom.includes(url) ? custom : custom ? `${custom}\n${url}` : `لینک محصولات: ${url}`;
  return sendSmsText(phone, body);
}

async function notifyCustomersOfNewCloth(session: Session, cloth: any) {
  try {
    if (!isTruthyFlag(cloth?.published)) return;
    const sub = await subscriptionForSession(session);
    if (denyPlanFeature(sub, 'product-sms')) return;
    const origin = await publicAppOrigin();
    if (!origin) return;
    const clothId = String(cloth?._id || '');
    if (!clothId) return;
    const { token } = await insertProductShare(session, String(cloth?.code || 'محصول جدید'), [clothId]);
    const url = shareUrl(token, origin);
    const customers = await M()
      .Person.find({
        _storeId: oid(session._storeId),
        role: '1',
        isDeleted: false,
      })
      .select('phoneNumber')
      .limit(80)
      .lean();
    for (const person of customers as any[]) {
      const phone = String(person.phoneNumber || '').trim();
      if (!PHONE_RE.test(phone)) continue;
      if (!rateLimit(`new-product-sms:${session._storeId}:${phone}`, 3, 24 * 60 * 60 * 1000)) continue;
      await sendSmsText(phone, `محصول جدید اضافه شد. مشاهده: ${url}`);
    }
  } catch {
    /* never block cloth create */
  }
}

export async function listProductShares(): Promise<ActionResult> {
  const access = await withWorkspace();
  if ('error' in access) return access.error;
  const denied = denyRead(access.session, 'product-share');
  if (denied) return denied;
  await db();
  const rows = await M()
    .ProductShare.find({ _storeId: oid(access.session._storeId), isDeleted: false })
    .sort({ timeStamp: -1 })
    .limit(50)
    .lean();
  return ok(
    serialize(
      (rows as any[]).map((row) => ({
        _id: row._id,
        token: row.token,
        title: row.title || '',
        _clothIds: shareClothIds(row._clothIds),
        clothCount: shareClothIds(row._clothIds).length,
        timeStamp: row.timeStamp,
      })),
    ),
  );
}

export async function deleteProductShare(id: string): Promise<ActionResult> {
  const access = await withWorkspace();
  if ('error' in access) return access.error;
  const denied = denyWrite(access.session, 'product-share');
  if (denied) return denied;
  await db();
  const row = await M().ProductShare.findOne({
    _id: oid(id),
    _storeId: oid(access.session._storeId),
    isDeleted: false,
  }).lean();
  if (!row) return fail('لینک پیدا نشد', 404);
  await M().ProductShare.findByIdAndUpdate(id, { isDeleted: true });
  return ok({ _id: id }, 'لینک حذف شد');
}

export async function getPublicSharedClothes(token: string): Promise<ActionResult> {
  const value = String(token || '').trim();
  if (value.length < 16 || value.length > 128) return fail('لینک نامعتبر است', 404);
  await db();
  const share = await M().ProductShare.findOne({ token: value, isDeleted: false }).lean();
  if (!share) return fail('این لینک پیدا نشد', 404);
  const ids = shareClothIds(share._clothIds);
  if (!ids.length) return fail('محصولی در این لینک نیست', 404);
  const query: any = M().Cloth.find({ _id: { $in: ids.map((id) => oid(id)) }, isDeleted: false });
  const rows = await query.select(PUBLIC_CLOTH_SELECT).populate(PUBLIC_CLOTH_POPULATE).lean();
  const byId = new Map((Array.isArray(rows) ? rows : []).map((row: any) => [String(row._id), row]));
  const ordered = ids.map((id) => byId.get(id)).filter(Boolean);
  const inStock = ordered.filter((row: any) => totalItems(packsFromCloth(row).packs) > 0);
  return ok(
    serialize({
      token: value,
      title: String(share.title || '').trim(),
      clothes: inStock,
    }),
  );
}

function storeIdOf(cloth: any) {
  const value = cloth?._storeId;
  if (value && typeof value === 'object' && '_id' in value) return String(value._id);
  return String(value || '');
}

async function sellPublicPacks(items: any[]): Promise<ActionResult<any[]>> {
  const needed = new Map<string, ClothPack[]>();
  const prepared: any[] = [];
  for (const item of items) {
    const id = lineClothId(item);
    if (!id) continue;
    const cloth = await (M().Cloth.findOne({ _id: oid(id), isDeleted: false }) as any).lean();
    if (!cloth) return fail('لباس پیدا نشد');
    const stock = packsFromCloth(cloth);
    const taken = linePacks(item, stock.packSize);
    if (!taken.length) return fail('حداقل یک بسته انتخاب کنید');
    const pieces = totalItems(taken);
    const minOrder = DEFAULT_MOQ;
    if (!meetsWholesaleMoq(pieces, minOrder, stock.packs, taken, stock.packSize)) {
      return fail(`حداقل سفارش عمده ${minOrder} عدد است`);
    }
    const listPrice = clothUnitPrice(cloth);
    prepared.push({
      _cloth: id,
      packs: taken,
      count: pieces,
      price: saleState({ ...cloth, wholesalePrice: listPrice }).salePrice,
      _storeId: storeIdOf(cloth),
    });
    needed.set(id, addPacks(needed.get(id) || [], taken));
  }
  const nextById = new Map<string, ClothPack[]>();
  for (const [id, taken] of needed) {
    const cloth = await (M().Cloth.findOne({ _id: oid(id), isDeleted: false }) as any).lean();
    if (!cloth) return fail('لباس پیدا نشد');
    const next = subtractPacks(packsFromCloth(cloth).packs, taken);
    if (!next) return fail('موجودی این لباس کافی نیست');
    nextById.set(id, next);
  }
  for (const [id, packs] of nextById) {
    await writeStock(id, packs);
  }
  return ok(prepared);
}

async function findOrCreateWholesaleCustomer(storeId: string, input: { fullName: string; phone: string; address: string }) {
  const phone = String(input.phone || '').trim();
  const existing =
    (await (M().Person.findOne({ _storeId: oid(storeId), isDeleted: false, role: '1', phoneNumber: phone }) as any).lean()) ||
    (await (M().Person.findOne({ _storeId: oid(storeId), isDeleted: false, role: '1', phoneNumber: Number(phone) }) as any).lean());
  if (existing) {
    await (M().Person as any).updateOne({ _id: existing._id }, { fullName: input.fullName, address: input.address, phoneNumber: phone });
    return existing._id;
  }
  const created = await M().Person.create({
    _storeId: oid(storeId),
    fullName: input.fullName,
    phoneNumber: phone,
    address: input.address,
    city: 0,
    role: ['1'],
    isDeleted: false,
  });
  return created._id;
}

export async function placeWholesaleOrder(input: {
  fullName: string;
  phone: string;
  address: string;
  items: Array<{ productId: string; packs?: ClothPack[]; count?: number; price?: number }>;
}): Promise<ActionResult> {
  await db();
  const fullName = String(input.fullName || '').trim();
  const phone = String(input.phone || '').trim();
  const address = String(input.address || '').trim();
  if (!fullName || !phone || !address) return fail('نام، موبایل و آدرس را کامل کنید');
  if (!PHONE_RE.test(phone)) return fail('شماره موبایل معتبر نیست');
  const ip = await clientIp();
  if (!rateLimit(`checkout:ip:${ip}`, 5, 10 * 60 * 1000) || !rateLimit(`checkout:phone:${phone}`, 5, 10 * 60 * 1000)) {
    return fail('تعداد درخواست‌ها زیاد است. کمی بعد دوباره تلاش کنید', 429);
  }
  const items = Array.isArray(input.items) ? input.items.filter((item) => item?.productId).slice(0, 20) : [];
  if (!items.length) return fail('سبد خالی است');

  const grouped = new Map<string, any[]>();
  for (const item of items) {
    const cloth = await (M().Cloth.findOne({ _id: oid(item.productId), isDeleted: false }) as any).lean();
    if (!cloth) return fail('لباس پیدا نشد');
    const storeId = storeIdOf(cloth);
    if (!storeId) return fail('فروشگاه این لباس مشخص نیست');
    const bucket = grouped.get(storeId) || [];
    bucket.push({
      _cloth: item.productId,
      packs: item.packs,
      count: item.count,
    });
    grouped.set(storeId, bucket);
  }

  const invoices: PublicOrderSummary[] = [];
  const written: Array<{ clothId: string; packs: ClothPack[] }> = [];
  try {
    for (const [storeId, storeItems] of grouped) {
      const sold = await sellPublicPacks(storeItems);
      if (!sold.ok) {
        for (const row of written) {
          const cloth = await (M().Cloth.findOne({ _id: oid(row.clothId), isDeleted: false }) as any).lean();
          if (!cloth) continue;
          await writeStock(row.clothId, addPacks(packsFromCloth(cloth).packs, row.packs));
        }
        return sold;
      }
      const soldItems = sold.data || [];
      for (const line of soldItems) written.push({ clothId: String(line._cloth), packs: line.packs });
      const store = await (M().Store.findOne({ _id: oid(storeId) }) as any).lean();
      const clientId = await findOrCreateWholesaleCustomer(storeId, { fullName, phone, address });
      let invoiceNumber = Math.floor(10000 + Math.random() * 9000);
      while (await M().Invoice.exists({ invoiceNumber })) {
        invoiceNumber = Math.floor(10000 + Math.random() * 9000);
      }
      const created = await M().Invoice.create({
        _storeId: oid(storeId),
        _brandId: store?._brandId ? oid(store._brandId) : undefined,
        _client: oid(clientId),
        receiverAddress: address,
        invoiceNumber,
        publicToken: publicOrderToken(),
        isSent: false,
        isDeleted: false,
      });
      if (soldItems.length) {
        await M().CustomerCart.insertMany(
          soldItems.map((item: any) => ({
            _storeId: oid(storeId),
            _invoice: created._id,
            _cloth: oid(item._cloth),
            count: item.count,
            packs: item.packs,
            price: item.price,
            isDeleted: false,
          })),
        );
      }
      const lines = await (M().CustomerCart.find({ _invoice: created._id, isDeleted: false }) as any)
        .populate({ path: '_cloth', populate: [{ path: '_type' }, { path: '_style' }] })
        .lean();
      invoices.push(summarizePublicInvoice(created, lines));
    }
  } catch {
    return failDb();
  }
  return ok(serialize({ invoices }), 'سفارش عمده ثبت شد');
}

function clothDisplayName(cloth: any) {
  if (!cloth || typeof cloth !== 'object') return 'لباس';
  const typeName = cloth._type && typeof cloth._type === 'object' ? cloth._type.name : '';
  const styleName = cloth._style && typeof cloth._style === 'object' ? cloth._style.name : '';
  return [typeName, styleName].filter(Boolean).join(' ') || `لباس ${cloth.code || ''}`.trim();
}

function summarizePublicInvoice(invoice: any, lines: any[]): PublicOrderSummary {
  const mapped = (Array.isArray(lines) ? lines : []).map((line) => {
    const count = Number(line.count || 0);
    const price = Number(line.price || 0);
    return {
      name: clothDisplayName(line._cloth),
      packsLabel: mergePacks(parsePacks(line.packs))
        .map((pack) => `${pack.count} بسته ${pack.items} تایی`)
        .join('، '),
      count,
      price,
      total: count * price,
    };
  });
  return {
    id: String(invoice.publicToken || invoice._id),
    invoiceNumber: invoice.invoiceNumber,
    total: mapped.reduce((sum, line) => sum + line.total, 0),
    lines: mapped,
  };
}

export async function getPublicOrderSummaries(tokens: string[]): Promise<ActionResult> {
  await db();
  const unique = [...new Set(tokens.map((token) => String(token || '').trim()).filter((token) => token.length >= 16 && token.length <= 128))].slice(
    0,
    8,
  );
  if (!unique.length) return fail('سفارش پیدا نشد', 404);
  const invoices: PublicOrderSummary[] = [];
  for (const token of unique) {
    const invoice = await (M().Invoice.findOne({ publicToken: token, isDeleted: false }) as any).lean();
    if (!invoice) continue;
    const lines = await (M().CustomerCart.find({ _invoice: invoice._id, isDeleted: false }) as any)
      .populate({ path: '_cloth', populate: [{ path: '_type' }, { path: '_style' }] })
      .lean();
    invoices.push(summarizePublicInvoice(invoice, lines));
  }
  if (!invoices.length) return fail('سفارش پیدا نشد', 404);
  return ok(serialize(invoices));
}

export async function getStore(): Promise<ActionResult> {
  const { getWorkspace } = await import('./workspace');
  return getWorkspace();
}

export async function addStoreBranch(payload: unknown, _main = false): Promise<ActionResult> {
  const { createStore } = await import('./workspace');
  const body = (payload || {}) as Record<string, unknown>;
  return createStore({
    name: body.name,
    address: body.address,
    phonenumbers: body.phonenumbers,
    city: body.city,
  });
}

export async function listPayments(id: string, type = '2', page = 1, skip = 20): Promise<ActionResult> {
  const auth = await withSession();
  if ('error' in auth) return auth.error;
  const denied = denyRead(auth.session, 'payment');
  if (denied) return denied;
  const paging = clampPage(page, skip);
  const extra = type === '1' ? { _invoice: oid(id) } : { _person: oid(id) };
  const rows = await M().Payment.find(storeFilter(auth.session, extra))
    .populate({ path: '_check', populate: { path: '_owner' } })
    .populate(type === '1' ? '_invoice' : '_person')
    .skip((paging.page - 1) * paging.skip)
    .limit(paging.skip)
    .lean();
  return ok(serialize(rows));
}

export async function createReceivedCheck(payload: unknown): Promise<ActionResult> {
  const auth = await withSession();
  if ('error' in auth) return auth.error;
  if (denyWrite(auth.session, 'payment') && denyWrite(auth.session, 'check')) {
    return fail('اجازه این کار را ندارید', 403);
  }
  const raw = (payload || {}) as Record<string, unknown>;
  if (!raw._owner || !raw.amount || !raw.dueDate) return fail('شخص، مبلغ و سررسید الزامی است');
  const next = preparePayload(auth.session, 'check', {
    direction: raw.direction === 'out' ? 'out' : 'in',
    _owner: raw._owner,
    amount: Number(raw.amount),
    dueDate: raw.dueDate,
    series: raw.series != null && String(raw.series).trim() ? String(raw.series).trim() : undefined,
    serialNumber: raw.serialNumber ? Number(raw.serialNumber) : undefined,
    sayadiNumber: raw.sayadiNumber ? Number(raw.sayadiNumber) : undefined,
    isCashed: false,
    isReturned: false,
    isTransferred: false,
  });
  const created = await M().Check.create(next);
  const cfg = lookups().check;
  if (cfg?.populate) await created.populate(cfg.populate);
  return ok(serialize(created.toObject ? created.toObject() : created), 'چک ثبت شد');
}

async function paymentUsesCheck(session: Session, checkId: unknown) {
  return M().Payment.findOne({
    _storeId: oid(session._storeId),
    isDeleted: false,
    $or: [{ _check: oid(checkId) }, { _checks: oid(checkId) }],
  }).lean();
}

async function resolvePaymentChecks(session: Session, item: any) {
  const ids = Array.isArray(item._checks)
    ? item._checks.filter(Boolean)
    : item._check
      ? [item._check]
      : [];
  if (item.check && typeof item.check === 'object' && !ids.length) {
    const draft = preparePayload(session, 'check', {
      direction: 'in',
      _owner: item._person || item._owner,
      amount: item.check.amount,
      dueDate: item.check.dueDate,
      series: item.check.series,
      serialNumber: item.check.serialNumber,
      sayadiNumber: item.check.sayadiNumber,
      isCashed: false,
      isReturned: false,
      isTransferred: false,
    });
    const checkDoc = await M().Check.create(draft);
    return { checkIds: [checkDoc._id], checkAmount: Number(item.check.amount || 0) };
  }
  const unique = [...new Set(ids.map((id: unknown) => String(id)))];
  if (unique.length !== ids.length) return fail('چک تکراری است');
  let checkAmount = 0;
  const checkIds: unknown[] = [];
  for (const id of unique) {
    const used = await paymentUsesCheck(session, id);
    if (used) return fail('این چک قبلاً در یک پرداخت ثبت شده');
    const existing = await M().Check.findOne(storeFilter(session, { _id: id })).lean();
    if (!existing) return fail('چک پیدا نشد');
    if (existing.direction === 'out' || existing.isReturned || existing.isTransferred || existing.isDeleted) {
      return fail('این چک قابل استفاده در پرداخت نیست');
    }
    checkAmount += Number(existing.amount || 0);
    checkIds.push(existing._id);
  }
  return { checkIds, checkAmount };
}

export async function createPayment(info: unknown): Promise<ActionResult> {
  const auth = await withSession();
  if ('error' in auth) return auth.error;
  const denied = denyWrite(auth.session, 'payment');
  if (denied) return denied;
  const items = Array.isArray(info) ? info : [info];
  const created: any[] = [];
  for (const item of items as any[]) {
    if (!item?._person) return fail('شخص الزامی است');
    const person = await M().Person.findOne(storeFilter(auth.session, { _id: item._person })).lean();
    if (!person) return fail('شخص پیدا نشد', 404);
    if (item._invoice) {
      const invoice = await M().Invoice.findOne(storeFilter(auth.session, { _id: item._invoice })).lean();
      if (!invoice) return fail('فاکتور پیدا نشد', 404);
    }
    const cash = Number(item.cashAmount ?? item.cash ?? 0);
    const discount = Number(item.discount || 0);
    const creditAmount = Number(item.creditAmount || 0);
    const resolved = await resolvePaymentChecks(auth.session, item);
    if ('ok' in resolved && resolved.ok === false) return resolved;
    const checkIds = (resolved as { checkIds: unknown[]; checkAmount: number }).checkIds;
    const checkAmount = (resolved as { checkIds: unknown[]; checkAmount: number }).checkAmount;
    if (!cash && !checkAmount && !discount && !creditAmount) {
      return fail('مبلغ نقد، چک، تخفیف یا نسیه را وارد کنید');
    }

    const base = {
      _storeId: oid(auth.session._storeId),
      _person: oid(item._person),
      description: item.description,
      isDeleted: false,
    };
    const withChecks = (slice: { cash: number; checkAmount: number; discount: number; creditAmount: number }) => {
      const useChecks = slice.checkAmount > 0 && checkIds.length > 0;
      return {
        ...base,
        _check: useChecks ? oid(checkIds[0]) : undefined,
        _checks: useChecks ? checkIds.map((id) => oid(id)) : [],
        cash: slice.cash,
        cashAmount: slice.cash,
        checkAmount: slice.checkAmount,
        creditAmount: slice.creditAmount,
        discount: slice.discount,
      };
    };

    // Pay toward a specific invoice — keep as one row.
    if (item._invoice) {
      created.push({
        ...withChecks({ cash, checkAmount, discount, creditAmount }),
        _invoice: oid(item._invoice),
      });
      continue;
    }

    // Pay toward all invoices: assign FIFO to open remainings so each invoice badge updates.
    const applied = cash + checkAmount + discount;
    const isCustomer = personIsCustomer((person as { role?: unknown }).role);
    if (isCustomer && applied > 0) {
      const openNeeds = await customerOpenInvoiceNeeds(auth.session, String(item._person));
      if (openNeeds.length) {
        let left = applied;
        const needs: Array<{ invoiceId: string; amount: number }> = [];
        for (const row of openNeeds) {
          if (left <= 0) break;
          const take = Math.min(left, row.amount);
          if (take > 0) {
            needs.push({ invoiceId: row.invoiceId, amount: take });
            left -= take;
          }
        }
        const slices = splitPaymentPartsAcrossNeeds({ cash, checkAmount, discount, creditAmount }, needs);
        for (const slice of slices) {
          created.push({
            ...withChecks(slice),
            _invoice: slice.invoiceId ? oid(slice.invoiceId) : undefined,
          });
        }
        continue;
      }
    }

    created.push({
      ...withChecks({ cash, checkAmount, discount, creditAmount }),
      _invoice: undefined,
    });
  }
  await M().Payment.insertMany(created);
  return ok(serialize(created[0] || null), 'پرداخت ثبت شد');
}

async function entityInStore(session: Session, id: string) {
  const filter = storeFilter(session, { _id: id });
  const [invoice, person, cloth, check, fabric, returned] = await Promise.all([
    M().Invoice.findOne(filter).select('_id').lean(),
    M().Person.findOne(filter).select('_id').lean(),
    M().Cloth.findOne({ _id: oid(id), ...clothVisibleFilter(session) }).select('_id').lean(),
    M().Check.findOne(filter).select('_id').lean(),
    M().Fabric.findOne(filter).select('_id').lean(),
    M().Returned.findOne(filter).select('_id').lean(),
  ]);
  return Boolean(invoice || person || cloth || check || fabric || returned);
}

function returnItemAmount(row: { count?: number; price?: number; boughtPrice?: number }) {
  return Number(row.count || 0) * Number(row.price ?? row.boughtPrice ?? 0);
}

function purchaseKey(invoiceId: unknown, clothId: unknown) {
  return `${relationKey(invoiceId)}:${relationKey(clothId)}`;
}

async function loadPersonReturnItems(session: Session, personId: string) {
  const headers = await M().Returned.find(storeFilter(session, { _returnedPerson: oid(personId) })).lean();
  if (!headers.length) return [] as any[];
  return M().ReturnedItems.find({
    _returned: { $in: (headers as any[]).map((row) => oid(row._id)) },
    isDeleted: false,
  })
    .populate({ path: '_cloth', populate: [{ path: '_type' }, { path: '_style' }] })
    .populate('_invoice', '_id invoiceNumber timeStamp')
    .lean();
}

function returnTotalsByInvoice(items: any[]) {
  const map = new Map<string, number>();
  for (const row of items) {
    const id = relationKey(row._invoice);
    if (!id) continue;
    map.set(id, (map.get(id) || 0) + returnItemAmount(row));
  }
  return map;
}

export async function addReturnedItem(payload: unknown): Promise<ActionResult> {
  const body = payload as Record<string, unknown>;
  if (body._person || body.personId) return receiveReturnedCloth(payload);
  const auth = await withSession();
  if ('error' in auth) return auth.error;
  const denied = denyWrite(auth.session, 'returned');
  if (denied) return denied;
  const returned = await M().Returned.findOne(storeFilter(auth.session, { _id: body._returned })).lean();
  if (!returned) return fail('برگشتی پیدا نشد', 404);
  const cloth = await M().Cloth.findOne({ _id: oid(body._cloth), ...clothVisibleFilter(auth.session) }).lean();
  if (!cloth) return fail('لباس پیدا نشد', 404);
  const count = Math.trunc(Number(body.count || 1));
  if (count < 1) return fail('تعداد برگشتی را وارد کنید');
  const created = await M().ReturnedItems.create({
    _storeId: oid(auth.session._storeId),
    _returned: oid(body._returned),
    _invoice: body._invoice ? oid(body._invoice) : undefined,
    _cloth: oid(body._cloth),
    count,
    price: Number(body.price ?? body.boughtPrice ?? 0),
    boughtPrice: Number(body.boughtPrice ?? body.price ?? 0),
    isDeleted: false,
  });
  await changeStock(body._cloth, count);
  return ok(serialize(created.toObject ? created.toObject() : created), 'ثبت شد');
}

export async function personReturns(personId: string): Promise<ActionResult> {
  const auth = await withSession();
  if ('error' in auth) return auth.error;
  const denied = denyMenu(auth.session, 'returned');
  if (denied) return denied;
  const person = await M().Person.findOne(storeFilter(auth.session, { _id: personId })).lean();
  if (!person) return fail('شخص پیدا نشد', 404);
  const invoices = await M().Invoice.find(storeFilter(auth.session, { _client: oid(personId) })).lean();
  const invoiceIds = (invoices as any[]).map((row) => oid(row._id));
  const lines = invoiceIds.length
    ? await M()
        .CustomerCart.find({
          _storeId: oid(auth.session._storeId),
          isDeleted: false,
          _invoice: { $in: invoiceIds },
        })
        .populate({ path: '_cloth', populate: [{ path: '_type' }, { path: '_style' }] })
        .lean()
    : [];
  const returnItems = await loadPersonReturnItems(auth.session, personId);
  const returnedCount = new Map<string, number>();
  for (const row of returnItems as any[]) {
    const key = purchaseKey(row._invoice, row._cloth);
    returnedCount.set(key, (returnedCount.get(key) || 0) + Number(row.count || 0));
  }
  const grouped = new Map<
    string,
    { invoiceId: string; invoiceNumber?: string | number; clothId: string; label: string; boughtCount: number; boughtAmount: number }
  >();
  for (const line of lines as any[]) {
    const invoiceId = relationKey(line._invoice);
    const clothId = relationKey(line._cloth);
    if (!invoiceId || !clothId) continue;
    const key = purchaseKey(invoiceId, clothId);
    const invoice = (invoices as any[]).find((row) => relationKey(row._id) === invoiceId);
    const current = grouped.get(key) || {
      invoiceId,
      invoiceNumber: invoice?.invoiceNumber,
      clothId,
      label: clothDisplayName(line._cloth),
      boughtCount: 0,
      boughtAmount: 0,
    };
    const count = Number(line.count || 0);
    current.boughtCount += count;
    current.boughtAmount += count * Number(line.price || 0);
    grouped.set(key, current);
  }
  const returnable = [...grouped.entries()]
    .map(([key, row]) => {
      const already = returnedCount.get(key) || 0;
      const remainingCount = Math.max(0, row.boughtCount - already);
      const boughtPrice = row.boughtCount > 0 ? row.boughtAmount / row.boughtCount : 0;
      return {
        key,
        invoiceId: row.invoiceId,
        invoiceNumber: row.invoiceNumber,
        clothId: row.clothId,
        label: row.label,
        boughtCount: row.boughtCount,
        returnedCount: already,
        remainingCount,
        boughtPrice,
      };
    })
    .filter((row) => row.remainingCount > 0)
    .sort((a, b) => a.label.localeCompare(b.label, 'fa'));
  const headers = await M().Returned.find(storeFilter(auth.session, { _returnedPerson: oid(personId) }))
    .sort('-timeStamp')
    .lean();
  const itemsByHeader = new Map<string, any[]>();
  for (const item of returnItems as any[]) {
    const id = relationKey(item._returned);
    const list = itemsByHeader.get(id) || [];
    list.push(item);
    itemsByHeader.set(id, list);
  }
  const receipts = (headers as any[]).map((header) => {
    const items = (itemsByHeader.get(relationKey(header._id)) || []).map((item) => ({
      _id: item._id,
      count: Number(item.count || 0),
      price: Number(item.price ?? item.boughtPrice ?? 0),
      boughtPrice: Number(item.boughtPrice ?? item.price ?? 0),
      amount: returnItemAmount(item),
      label: clothDisplayName(item._cloth),
      invoiceNumber: item._invoice && typeof item._invoice === 'object' ? item._invoice.invoiceNumber : undefined,
    }));
    return {
      _id: header._id,
      timeStamp: header.timeStamp,
      description: header.description || '',
      amount: items.reduce((sum: number, row: { amount: number }) => sum + row.amount, 0),
      items,
    };
  });
  const returnTotal = receipts.reduce((sum: number, row: { amount: number }) => sum + row.amount, 0);
  return ok(
    serialize({
      person,
      returnable,
      receipts,
      returnTotal,
    }),
  );
}

export async function receiveReturnedCloth(payload: unknown): Promise<ActionResult> {
  const auth = await withSession();
  if ('error' in auth) return auth.error;
  const denied = denyWrite(auth.session, 'returned');
  if (denied) return denied;
  const body = payload as Record<string, unknown>;
  const personId = String(body.personId || body._person || '');
  const invoiceId = String(body.invoiceId || body._invoice || '');
  const clothId = String(body.clothId || body._cloth || '');
  const count = Math.trunc(Number(body.count || 0));
  if (!personId) return fail('شخص را انتخاب کنید');
  if (!invoiceId) return fail('فاکتور لباس برگشتی را انتخاب کنید');
  if (!clothId) return fail('لباس برگشتی را انتخاب کنید');
  if (count < 1) return fail('تعداد برگشتی را وارد کنید');
  const person = await M().Person.findOne(storeFilter(auth.session, { _id: personId })).lean();
  if (!person) return fail('شخص پیدا نشد', 404);
  const invoice = await M().Invoice.findOne(storeFilter(auth.session, { _id: invoiceId, _client: oid(personId) })).lean();
  if (!invoice) return fail('این فاکتور برای این شخص نیست', 404);
  const cloth = await M().Cloth.findOne({ _id: oid(clothId), isDeleted: false }).lean();
  if (!cloth) return fail('لباس پیدا نشد', 404);
  const lines = await M()
    .CustomerCart.find({
      _storeId: oid(auth.session._storeId),
      isDeleted: false,
      _invoice: oid(invoiceId),
      _cloth: oid(clothId),
    })
    .lean();
  const boughtCount = (lines as any[]).reduce((sum, row) => sum + Number(row.count || 0), 0);
  const boughtAmount = (lines as any[]).reduce((sum, row) => sum + Number(row.count || 0) * Number(row.price || 0), 0);
  if (!boughtCount) return fail('این لباس در فاکتور این شخص نیست');
  const boughtPrice = boughtAmount / boughtCount;
  const previous = await M().ReturnedItems.find({
    _invoice: oid(invoiceId),
    _cloth: oid(clothId),
    isDeleted: false,
  }).lean();
  const already = (previous as any[]).reduce((sum, row) => sum + Number(row.count || 0), 0);
  if (count > Math.max(0, boughtCount - already)) return fail('تعداد برگشتی بیشتر از خرید این فاکتور است');
  const useBought = Boolean(body.useBoughtPrice);
  const price = useBought ? boughtPrice : Number(body.price);
  if (!Number.isFinite(price) || price < 0) return fail('قیمت دریافت را وارد کنید');
  const stock = await changeStock(clothId, count);
  if (!stock.ok) return stock;
  const header = await M().Returned.create({
    _storeId: oid(auth.session._storeId),
    _returnedPerson: oid(personId),
    description: String(body.description || '').trim() || `برگشت ${count} عدد از فاکتور ${invoice.invoiceNumber || ''}`,
    isDeleted: false,
  });
  const created = await M().ReturnedItems.create({
    _storeId: oid(auth.session._storeId),
    _returned: header._id,
    _invoice: oid(invoiceId),
    _cloth: oid(clothId),
    count,
    price,
    boughtPrice,
    isDeleted: false,
  });
  return ok(serialize(created.toObject ? created.toObject() : created), 'لباس دریافت شد و به حساب مشتری بستانکار شد');
}

export async function listAttachments(id: string): Promise<ActionResult> {
  const auth = await withSession();
  if ('error' in auth) return auth.error;
  if (!(await entityInStore(auth.session, id))) return fail('پیدا نشد', 404);
  const rows = await M().Attachment.find({ entityId: oid(id) }).lean();
  return ok(serialize(rows));
}

export async function deleteAttachment(id: string): Promise<ActionResult> {
  const auth = await withSession();
  if ('error' in auth) return auth.error;
  const row = await M().Attachment.findById(id).lean();
  if (!row) return fail('پیدا نشد', 404);
  if (!(await entityInStore(auth.session, String(row.entityId || '')))) return fail('اجازه این کار را ندارید', 403);
  await M().Attachment.findByIdAndDelete(id);
  return ok(null, 'حذف شد');
}

export async function listUserPermisions(): Promise<ActionResult> {
  const auth = await withSession();
  if ('error' in auth) return auth.error;
  if (auth.session.isPlatformAdmin) return ok(['IS_ADMIN']);
  if (auth.session.storeRole === 'owner') return ok(['IS_OWNER']);
  const rows = await M().UserPermision.find({ _userId: auth.session._id }).populate('_permision').lean();
  return ok(serialize(rows));
}

export async function clothCounts(id: string, type: string): Promise<ActionResult> {
  const auth = await withSession();
  if ('error' in auth) return auth.error;
  const denied = denyMenu(auth.session, 'account');
  if (denied) return denied;
  if (type === '3') {
    const fabrics = await M().Fabric.find(storeFilter(auth.session, { _mercer: oid(id) })).lean();
    return ok(serialize(fabrics));
  }
  if (type === '2') {
    return ok(serialize(await M().Cloth.find(storeFilter(auth.session, { _tailor: oid(id) })).select('tailorFee count timeStamp').lean()));
  }
  if (type === '5') {
    return ok(serialize(await M().Cloth.find(storeFilter(auth.session, { _wash: oid(id) })).select('washFee count timeStamp').lean()));
  }
  if (type === '6') {
    return ok(serialize(await M().Cloth.find(storeFilter(auth.session, { _trim: oid(id) })).select('trimFee count timeStamp').lean()));
  }
  if (type === '7') {
    return ok(serialize(await M().Cloth.find(storeFilter(auth.session, { _print: oid(id) })).select('printFee count timeStamp').lean()));
  }
  return fail('نوع نامعتبر');
}

function relationKey(value: unknown) {
  if (!value) return '';
  if (typeof value === 'object' && value && '_id' in (value as object)) return String((value as { _id: unknown })._id);
  return String(value);
}

function paymentCheckIds(row: { _check?: unknown; _checks?: unknown }) {
  const list = Array.isArray(row._checks) ? row._checks : [];
  return [...new Set([...list, row._check].map(relationKey).filter(Boolean))];
}

function paymentMethodCounts(payments: any[]) {
  let cashCount = 0;
  let checkCount = 0;
  for (const row of payments) {
    if (Number(row.cashAmount ?? row.cash ?? 0) > 0) cashCount += 1;
    const loaded = Array.isArray(row.checks) ? row.checks.filter(Boolean) : [];
    if (loaded.length) checkCount += loaded.length;
    else if (paymentCheckIds(row).length || Number(row.checkAmount || 0) > 0) checkCount += 1;
  }
  return { paymentCount: payments.length, cashCount, checkCount };
}

/** Spread cash → discount → check across invoice needs (oldest first); leftover stays unassigned. */
function splitPaymentPartsAcrossNeeds(
  parts: { cash: number; checkAmount: number; discount: number; creditAmount: number },
  needs: Array<{ invoiceId: string; amount: number }>,
) {
  let cash = Math.max(0, Number(parts.cash || 0));
  let checkAmount = Math.max(0, Number(parts.checkAmount || 0));
  let discount = Math.max(0, Number(parts.discount || 0));
  let creditAmount = Math.max(0, Number(parts.creditAmount || 0));
  const slices: Array<{
    invoiceId: string;
    cash: number;
    checkAmount: number;
    discount: number;
    creditAmount: number;
  }> = [];

  const take = (want: number) => {
    let left = Math.max(0, want);
    const cashTake = Math.min(left, cash);
    cash -= cashTake;
    left -= cashTake;
    const discountTake = Math.min(left, discount);
    discount -= discountTake;
    left -= discountTake;
    const checkTake = Math.min(left, checkAmount);
    checkAmount -= checkTake;
    return { cash: cashTake, checkAmount: checkTake, discount: discountTake, creditAmount: 0 };
  };

  for (const need of needs) {
    if (need.amount <= 0) continue;
    slices.push({ invoiceId: need.invoiceId, ...take(need.amount) });
  }
  if (cash > 0 || checkAmount > 0 || discount > 0 || creditAmount > 0) {
    slices.push({ invoiceId: '', cash, checkAmount, discount, creditAmount });
  }
  return slices.filter(
    (slice) => slice.cash > 0 || slice.checkAmount > 0 || slice.discount > 0 || slice.creditAmount > 0,
  );
}

/** Apply person-level (no invoice) payments onto invoice remainings, oldest invoice first. */
function allocateUnassignedToInvoices<
  T extends { _id: unknown; timeStamp?: string; total: number; paid: number; returnTotal: number },
>(invoiceRows: T[], unassignedApplied: number) {
  let pool = Math.max(0, unassignedApplied);
  if (!pool || !invoiceRows.length) {
    return invoiceRows.map((row) => ({
      ...row,
      remaining: Math.max(0, row.total - row.paid - row.returnTotal),
    }));
  }
  const extra = new Map<string, number>();
  const oldestFirst = [...invoiceRows].sort(
    (a, b) => new Date(a.timeStamp || 0).getTime() - new Date(b.timeStamp || 0).getTime(),
  );
  for (const row of oldestFirst) {
    if (pool <= 0) break;
    const before = Math.max(0, row.total - row.paid - row.returnTotal);
    if (before <= 0) continue;
    const take = Math.min(pool, before);
    extra.set(relationKey(row._id), take);
    pool -= take;
  }
  return invoiceRows.map((row) => {
    const paid = row.paid + (extra.get(relationKey(row._id)) || 0);
    return {
      ...row,
      paid,
      remaining: Math.max(0, row.total - paid - row.returnTotal),
    };
  });
}

async function customerOpenInvoiceNeeds(session: Session, personId: string) {
  const [invoices, totals, payments, returnItems] = await Promise.all([
    M().Invoice.find(storeFilter(session, { _client: oid(personId) })).lean(),
    cartTotalsMap(session),
    M().Payment.find(storeFilter(session, { _person: oid(personId) })).lean(),
    loadPersonReturnItems(session, personId),
  ]);
  const returnByInvoice = returnTotalsByInvoice(returnItems);
  let unassigned = 0;
  const paidByInvoice = new Map<string, number>();
  for (const payment of payments as any[]) {
    const applied = paymentApplied(payment);
    const invoiceId = relationKey(payment._invoice);
    if (!invoiceId) {
      unassigned += applied;
      continue;
    }
    paidByInvoice.set(invoiceId, (paidByInvoice.get(invoiceId) || 0) + applied);
  }
  const rows = (invoices as any[]).map((invoice) => {
    const id = relationKey(invoice._id);
    const total = totals[id] || 0;
    const paid = paidByInvoice.get(id) || 0;
    const returned = returnByInvoice.get(id) || 0;
    return {
      _id: invoice._id,
      timeStamp: invoice.timeStamp,
      total,
      paid,
      returnTotal: returned,
      remaining: Math.max(0, total - paid - returned),
    };
  });
  const withPool = allocateUnassignedToInvoices(rows, unassigned);
  return withPool
    .filter((row) => row.remaining > 0)
    .sort((a, b) => new Date(a.timeStamp || 0).getTime() - new Date(b.timeStamp || 0).getTime())
    .map((row) => ({ invoiceId: relationKey(row._id), amount: row.remaining }));
}

async function withPaymentChecks(payments: any[]) {
  const ids = [...new Set(payments.flatMap((row) => paymentCheckIds(row)))];
  if (!ids.length) return payments.map((row) => ({ ...row, checks: [] }));
  const rows = await M().Check.find({ _id: { $in: ids.map(oid) } }).lean();
  const map = new Map((rows as any[]).map((row) => [String(row._id), row]));
  return payments.map((row) => ({
    ...row,
    checks: paymentCheckIds(row).map((id) => map.get(id)).filter(Boolean),
  }));
}

async function cartTotalsMap(session: Session) {
  const lines = await M().CustomerCart.find(storeFilter(session)).lean();
  const map: Record<string, number> = {};
  for (const line of lines) {
    const id = relationKey(line._invoice);
    map[id] = (map[id] || 0) + Number(line.count || 0) * Number(line.price || 0);
  }
  return map;
}

function salesInRange(invoices: any[], totals: Record<string, number>, start: Date) {
  let amount = 0;
  let count = 0;
  for (const invoice of invoices) {
    const ts = new Date(invoice.timeStamp);
    if (Number.isNaN(ts.getTime()) || ts < start) continue;
    amount += totals[relationKey(invoice._id)] || 0;
    count += 1;
  }
  return { amount, count };
}

function salesByPersianMonth(invoices: any[], totals: Record<string, number>, year: string) {
  const months = PERSIAN_MONTHS.map((label) => ({ label, amount: 0, count: 0 }));
  for (const invoice of invoices) {
    const ts = new Date(invoice.timeStamp);
    if (Number.isNaN(ts.getTime())) continue;
    const key = persianYearMonth(ts);
    const [invoiceYear, month] = key.split('/');
    if (invoiceYear !== year) continue;
    const index = Number(month) - 1;
    if (index < 0 || index > 11) continue;
    months[index].amount += totals[relationKey(invoice._id)] || 0;
    months[index].count += 1;
  }
  return months;
}

function salesForPersianKey(invoices: any[], totals: Record<string, number>, match: (key: string) => boolean) {
  let amount = 0;
  let count = 0;
  for (const invoice of invoices) {
    const ts = new Date(invoice.timeStamp);
    if (Number.isNaN(ts.getTime())) continue;
    if (!match(persianYearMonth(ts))) continue;
    amount += totals[relationKey(invoice._id)] || 0;
    count += 1;
  }
  return { amount, count };
}

export async function dashboardStats(): Promise<ActionResult> {
  const auth = await withSession();
  if ('error' in auth) return auth.error;
  const denied = denyMenu(auth.session, 'dashboard');
  if (denied) return denied;
  const filter = storeFilter(auth.session);
  const [invoices, payments, checks, people, totals] = await Promise.all([
    M().Invoice.find(filter).populate('_client', '_id fullName').lean(),
    M().Payment.find(filter).lean(),
    M().Check.find(filter).populate('_owner', '_id fullName').lean(),
    M().Person.find(filter).lean(),
    cartTotalsMap(auth.session),
  ]);
  const now = new Date();
  const monthKey = persianYearMonth(now);
  const yearKey = monthKey.slice(0, 4);
  const startWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const paidByInvoice: Record<string, number> = {};
  const paidByPerson: Record<string, number> = {};
  for (const payment of payments) {
    const invoiceId = relationKey(payment._invoice);
    const personId = relationKey(payment._person);
    const applied = paymentApplied(payment);
    if (invoiceId) paidByInvoice[invoiceId] = (paidByInvoice[invoiceId] || 0) + applied;
    else if (personId) paidByPerson[personId] = (paidByPerson[personId] || 0) + applied;
  }
  const debtMap: Record<string, { name: string; remaining: number }> = {};
  for (const invoice of invoices) {
    const personId = relationKey(invoice._client);
    if (!personId) continue;
    const remaining = Math.max(0, (totals[relationKey(invoice._id)] || 0) - (paidByInvoice[relationKey(invoice._id)] || 0));
    if (remaining <= 0) continue;
    const name = invoice._client?.fullName || people.find((p: any) => String(p._id) === personId)?.fullName || personId;
    const current = debtMap[personId] || { name, remaining: 0 };
    current.remaining += remaining;
    debtMap[personId] = current;
  }
  for (const [personId, extraPaid] of Object.entries(paidByPerson)) {
    if (!debtMap[personId]) continue;
    debtMap[personId].remaining = Math.max(0, debtMap[personId].remaining - extraPaid);
    if (debtMap[personId].remaining <= 0) delete debtMap[personId];
  }
  const dueThisMonth = checks
    .filter((row: any) => dueDateMonthKey(row.dueDate) === monthKey && !row.isCashed && !row.isReturned)
    .sort((a: any, b: any) => String(a.dueDate || '').localeCompare(String(b.dueDate || '')));
  const returned = checks.filter((row: any) => row.isReturned);
  const partnerShares = await partnerYearShares(auth.session, invoices, yearKey);
  return ok(
    serialize({
      sales: {
        week: salesInRange(invoices, totals, startWeek),
        month: salesForPersianKey(invoices, totals, (key) => key === monthKey),
        year: salesForPersianKey(invoices, totals, (key) => key.startsWith(`${yearKey}/`)),
      },
      monthlySales: salesByPersianMonth(invoices, totals, yearKey),
      dueThisMonth,
      returnedChecks: returned,
      debtors: Object.entries(debtMap)
        .map(([id, row]) => ({ _id: id, ...row }))
        .sort((a, b) => b.remaining - a.remaining),
      partnerShares,
    }),
  );
}

async function partnerYearShares(session: Session, invoices: any[], yearKey: string) {
  const brand = session._brandId
    ? await M().Brand.findOne({ _id: oid(session._brandId), isDeleted: false }).lean()
    : null;
  const ownerId = brand?._userId || session._id;
  const partners = await M()
    .Partner.find({
      isDeleted: false,
      $or: [
        { _userId: oid(ownerId) },
        { _brandIds: oid(session._brandId) },
        { _storeIds: oid(session._storeId) },
        { _brandId: oid(session._brandId) },
        { _storeId: oid(session._storeId) },
      ],
    })
    .lean();
  const applicable = partnersForStore(partners, String(session._storeId || ''), session._brandId);
  if (!applicable.length) {
    return { rows: [], pool: 0, assigned: 0, ownerShare: 0, total: 0, percentSum: 0 };
  }
  const yearIds = new Set(
    invoices
      .filter((invoice: any) => {
        const key = persianYearMonth(invoice.timeStamp);
        return key.startsWith(`${yearKey}/`);
      })
      .map((invoice: any) => relationKey(invoice._id)),
  );
  const lines = await (M().CustomerCart.find(storeFilter(session)) as any)
    .populate({ path: '_cloth', select: '_partner' })
    .lean();
  return allocateIncome(
    lines
      .filter((line: any) => yearIds.has(relationKey(line._invoice)))
      .map((line: any) => ({
        amount: Number(line.count || 0) * Number(line.price || 0),
        partnerId: relationKey(typeof line._cloth === 'object' ? line._cloth?._partner : ''),
      })),
    applicable.map((row: any) => ({
      _id: String(row._id),
      name: row.name || '',
      sharePercent: Number(row.sharePercent || 0),
      allStores: Boolean(row.allStores),
      _brandIds: row._brandIds,
      _storeIds: row._storeIds,
      _brandId: row._brandId,
      _storeId: row._storeId,
    })),
  );
}

export async function personAccount(personId: string): Promise<ActionResult> {
  const auth = await withSession();
  if ('error' in auth) return auth.error;
  const denied = denyMenu(auth.session, 'account');
  if (denied) return denied;
  const person = await M().Person.findOne(storeFilter(auth.session, { _id: personId })).lean();
  if (!person) return fail('شخص پیدا نشد', 404);
  const roles = normalizePersonRoles(person.role);
  const roleLabel = personRolesLabel(roles) || personRoleLabel(person.role);
  const payments = await withPaymentChecks(
    await M().Payment.find(storeFilter(auth.session, { _person: oid(personId) }))
      .populate('_check')
      .populate('_invoice')
      .lean(),
  );
  const paidTotal = payments.reduce((sum: number, row: any) => sum + paymentApplied(row), 0);

  const payableRoles = roles.filter((role) => isPayablePersonRole(role));
  const isCustomer = personIsCustomer(roles);
  const isPayable = payableRoles.length > 0;

  let vendorRows: any[] = [];
  if (isPayable) {
    const seen = new Set<string>();
    for (const role of payableRoles) {
      const rows = await vendorItems(auth.session, personId, role);
      for (const row of rows) {
        const key = String(row._id);
        if (seen.has(key)) continue;
        seen.add(key);
        vendorRows.push(row);
      }
    }
  }

  if (isPayable && !isCustomer) {
    const owedTotal = vendorRows.reduce((sum, row) => sum + Number(row.total || 0), 0);
    return ok(
      serialize({
        person,
        kind: 'payable',
        role: roles[0] || '',
        roles,
        roleLabel,
        items: vendorRows,
        invoices: [],
        payments,
        purchaseTotal: owedTotal,
        owedTotal,
        paidTotal,
        remaining: Math.max(0, owedTotal - paidTotal),
      }),
    );
  }

  const [invoices, totals, returnItems] = await Promise.all([
    M().Invoice.find(storeFilter(auth.session, { _client: oid(personId) })).lean(),
    cartTotalsMap(auth.session),
    loadPersonReturnItems(auth.session, personId),
  ]);
  const returnTotal = (returnItems as any[]).reduce((sum, row) => sum + returnItemAmount(row), 0);
  const returnByInvoice = returnTotalsByInvoice(returnItems);
  const unassignedApplied = payments
    .filter((row: any) => !relationKey(row._invoice))
    .reduce((sum: number, row: any) => sum + paymentApplied(row), 0);
  const invoiceRows = allocateUnassignedToInvoices(
    invoices.map((invoice: any) => {
      const total = totals[relationKey(invoice._id)] || 0;
      const related = payments.filter((row: any) => relationKey(row._invoice) === relationKey(invoice._id));
      const paid = related.reduce((sum: number, row: any) => sum + paymentApplied(row), 0);
      const returned = returnByInvoice.get(relationKey(invoice._id)) || 0;
      return {
        _id: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        timeStamp: invoice.timeStamp,
        total,
        paid,
        returnTotal: returned,
        ...paymentMethodCounts(related),
      };
    }),
    unassignedApplied,
  ).sort((a: any, b: any) => new Date(b.timeStamp).getTime() - new Date(a.timeStamp).getTime());
  const purchaseTotal = invoiceRows.reduce((sum, row) => sum + row.total, 0);
  const vendorTotal = vendorRows.reduce((sum, row) => sum + Number(row.total || 0), 0);
  const net = purchaseTotal - paidTotal - returnTotal;
  const kind = isPayable && isCustomer ? 'both' : 'receivable';
  return ok(
    serialize({
      person,
      kind,
      role: roles[0] || '1',
      roles,
      roleLabel,
      items: vendorRows,
      invoices: invoiceRows,
      payments,
      purchaseTotal,
      owedTotal: purchaseTotal + vendorTotal,
      paidTotal,
      returnTotal,
      remaining: Math.max(0, net),
      creditToCustomer: Math.max(0, -net),
      vendorTotal,
    }),
  );
}

async function vendorItems(session: Session, personId: string, role: string) {
  if (role === '3') {
    const fabrics = await M().Fabric.find(storeFilter(session, { _mercer: oid(personId) })).lean();
    return fabrics.map((row: any) => ({
      _id: row._id,
      kind: 'fabric',
      label: `${row.amount || 0} متر پارچه`,
      timeStamp: row.timeStamp,
      total: fabricLotTotal(row),
    }));
  }
  if (role === '2') {
    const clothes = await M().Cloth.find(storeFilter(session, { _tailor: oid(personId) }))
      .select('code count tailorFee timeStamp')
      .lean();
    return clothes.map((row: any) => ({
      _id: row._id,
      kind: 'cloth',
      label: `لباس ${row.code || '—'} — ${row.count || 0} عدد`,
      timeStamp: row.timeStamp,
      total: clothPayTotal(row, row.tailorFee),
    }));
  }
  if (role === '5') {
    const clothes = await M().Cloth.find(storeFilter(session, { _wash: oid(personId) }))
      .select('code count washFee timeStamp')
      .lean();
    return clothes.map((row: any) => ({
      _id: row._id,
      kind: 'cloth',
      label: `لباس ${row.code || '—'} — ${row.count || 0} عدد`,
      timeStamp: row.timeStamp,
      total: clothPayTotal(row, row.washFee),
    }));
  }
  if (role === '6') {
    const clothes = await M().Cloth.find(storeFilter(session, { _trim: oid(personId) }))
      .select('code count trimFee timeStamp')
      .lean();
    return clothes.map((row: any) => ({
      _id: row._id,
      kind: 'cloth',
      label: `لباس ${row.code || '—'} — ${row.count || 0} عدد`,
      timeStamp: row.timeStamp,
      total: clothPayTotal(row, row.trimFee),
    }));
  }
  if (role === '7') {
    const clothes = await M().Cloth.find(storeFilter(session, { _print: oid(personId) }))
      .select('code count printFee timeStamp')
      .lean();
    return clothes.map((row: any) => ({
      _id: row._id,
      kind: 'cloth',
      label: `لباس ${row.code || '—'} — ${row.count || 0} عدد`,
      timeStamp: row.timeStamp,
      total: clothPayTotal(row, row.printFee),
    }));
  }
  const clothes = await M().Cloth.find(storeFilter(session, { _boughtFrom: oid(personId) }))
    .select('code count boughtFee timeStamp')
    .lean();
  return clothes.map((row: any) => ({
    _id: row._id,
    kind: 'cloth',
    label: `لباس ${row.code || '—'} — ${row.count || 0} عدد`,
    timeStamp: row.timeStamp,
    total: clothPayTotal(row, row.boughtFee),
  }));
}

export async function invoiceBalance(invoiceId: string): Promise<ActionResult> {
  const auth = await withSession();
  if ('error' in auth) return auth.error;
  const denied = denyRead(auth.session, 'invoice');
  if (denied) return denied;
  const invoice = await M().Invoice.findOne(storeFilter(auth.session, { _id: invoiceId }))
    .populate('_client', '_id fullName')
    .lean();
  if (!invoice) return fail('فاکتور پیدا نشد', 404);
  const clientId = relationKey((invoice as any)._client);
  const [lines, payments, siblingInvoices, totals, allReturnItems] = await Promise.all([
    M().CustomerCart.find(storeFilter(auth.session, { _invoice: oid(invoiceId) })).lean(),
    withPaymentChecks(
      await M().Payment.find(
        storeFilter(
          auth.session,
          clientId ? { _person: oid(clientId) } : { _invoice: oid(invoiceId) },
        ),
      )
        .populate('_check')
        .lean(),
    ),
    clientId
      ? M().Invoice.find(storeFilter(auth.session, { _client: oid(clientId) })).lean()
      : Promise.resolve([invoice]),
    cartTotalsMap(auth.session),
    clientId ? loadPersonReturnItems(auth.session, clientId) : Promise.resolve([] as any[]),
  ]);
  const allReturnByInvoice = returnTotalsByInvoice(allReturnItems as any[]);
  const unassignedApplied = (payments as any[])
    .filter((row) => !relationKey(row._invoice))
    .reduce((sum, row) => sum + paymentApplied(row), 0);
  const siblingRows = allocateUnassignedToInvoices(
    (siblingInvoices as any[]).map((row) => {
      const id = relationKey(row._id);
      const related = (payments as any[]).filter((payment) => relationKey(payment._invoice) === id);
      const paid = related.reduce((sum, payment) => sum + paymentApplied(payment), 0);
      return {
        _id: row._id,
        timeStamp: row.timeStamp,
        total: totals[id] || 0,
        paid,
        returnTotal: allReturnByInvoice.get(id) || 0,
      };
    }),
    unassignedApplied,
  );
  const thisRow = siblingRows.find((row) => relationKey(row._id) === relationKey(invoiceId));
  const invoicePayments = (payments as any[]).filter(
    (row) => relationKey(row._invoice) === relationKey(invoiceId),
  );
  const total = lines.reduce((sum: number, line: any) => sum + Number(line.count || 0) * Number(line.price || 0), 0);
  const paid = thisRow?.paid ?? invoicePayments.reduce((sum: number, row: any) => sum + paymentApplied(row), 0);
  const returned = thisRow?.returnTotal ?? 0;
  return ok(
    serialize({
      invoice,
      total,
      paid,
      returnTotal: returned,
      remaining: Math.max(0, total - paid - returned),
      payments: invoicePayments,
    }),
  );
}

export async function clothProfitSummary(clothId: string): Promise<ActionResult> {
  const auth = await withSession();
  if ('error' in auth) return auth.error;
  const denied = denyRead(auth.session, 'cloth');
  if (denied) return denied;
  const cloth = await M().Cloth.findOne({ _id: oid(clothId), ...clothVisibleFilter(auth.session) })
    .populate({
      path: '_producedFrom',
      select: 'amount priceForUnit priceForShipingForUnit discount extras',
    })
    .lean();
  if (!cloth) return fail('لباس پیدا نشد', 404);

  const finishedUnit = clothFinishedUnitCost(cloth);
  const listUnit = clothUnitPrice(cloth);

  const [saleLines, returnItems] = await Promise.all([
    M().CustomerCart.find(storeFilter(auth.session, { _cloth: oid(clothId) }))
      .populate({
        path: '_invoice',
        select: '_id invoiceNumber timeStamp _client',
        populate: { path: '_client', select: '_id fullName' },
      })
      .lean(),
    M().ReturnedItems.find({ _cloth: oid(clothId), isDeleted: false }).lean(),
  ]);

  const priceQty = new Map<number, number>();
  const clothByInvoice = new Map<string, number>();
  const sales: Array<{
    _id: string;
    invoiceId: string;
    invoiceNumber?: string | number;
    timeStamp?: string;
    clientId?: string;
    clientName?: string;
    count: number;
    price: number;
    amount: number;
    packs?: unknown;
  }> = [];
  let soldQty = 0;
  let grossRevenue = 0;
  for (const line of saleLines as any[]) {
    const qty = Number(line.count || 0);
    const price = Number(line.price || 0);
    if (qty <= 0) continue;
    soldQty += qty;
    grossRevenue += qty * price;
    priceQty.set(price, (priceQty.get(price) || 0) + qty);
    const invoice = line._invoice && typeof line._invoice === 'object' ? line._invoice : null;
    const invoiceId = relationKey(line._invoice);
    if (invoiceId) {
      clothByInvoice.set(invoiceId, (clothByInvoice.get(invoiceId) || 0) + qty * price);
    }
    const client = invoice?._client && typeof invoice._client === 'object' ? invoice._client : null;
    sales.push({
      _id: String(line._id),
      invoiceId,
      invoiceNumber: invoice?.invoiceNumber,
      timeStamp: invoice?.timeStamp || line.timeStamp,
      clientId: relationKey(invoice?._client),
      clientName: client?.fullName ? String(client.fullName) : '',
      count: qty,
      price,
      amount: qty * price,
      packs: line.packs,
    });
  }
  sales.sort(
    (a, b) => new Date(b.timeStamp || 0).getTime() - new Date(a.timeStamp || 0).getTime(),
  );

  let returnedQty = 0;
  let returnedRevenue = 0;
  for (const row of returnItems as any[]) {
    const qty = Number(row.count || 0);
    if (qty <= 0) continue;
    returnedQty += qty;
    returnedRevenue += qty * Number(row.price ?? row.boughtPrice ?? 0);
  }

  const netQty = Math.max(0, soldQty - returnedQty);
  const revenue = Math.max(0, grossRevenue - returnedRevenue);
  const cogs = netQty * finishedUnit;
  const totalProfit = revenue - cogs;
  const avgSell = netQty > 0 ? revenue / netQty : 0;

  const invoiceIds = [...clothByInvoice.keys()];
  let cashShare = 0;
  let checkShare = 0;
  if (invoiceIds.length) {
    const oids = invoiceIds.map((id) => oid(id));
    const [invoiceLines, payments] = await Promise.all([
      M().CustomerCart.find(storeFilter(auth.session, { _invoice: { $in: oids } })).lean(),
      M().Payment.find(storeFilter(auth.session, { _invoice: { $in: oids } })).lean(),
    ]);
    const invoiceTotals = new Map<string, number>();
    for (const line of invoiceLines as any[]) {
      const id = relationKey(line._invoice);
      if (!id) continue;
      invoiceTotals.set(
        id,
        (invoiceTotals.get(id) || 0) + Number(line.count || 0) * Number(line.price || 0),
      );
    }
    const cashByInvoice = new Map<string, number>();
    const checkByInvoice = new Map<string, number>();
    for (const payment of payments as any[]) {
      const id = relationKey(payment._invoice);
      if (!id) continue;
      cashByInvoice.set(
        id,
        (cashByInvoice.get(id) || 0) + Number(payment.cashAmount ?? payment.cash ?? 0),
      );
      checkByInvoice.set(id, (checkByInvoice.get(id) || 0) + Number(payment.checkAmount || 0));
    }
    for (const [invoiceId, clothRevenue] of clothByInvoice) {
      const total = invoiceTotals.get(invoiceId) || 0;
      if (total <= 0 || clothRevenue <= 0) continue;
      const ratio = Math.min(1, clothRevenue / total);
      cashShare += (cashByInvoice.get(invoiceId) || 0) * ratio;
      checkShare += (checkByInvoice.get(invoiceId) || 0) * ratio;
    }
  }

  const paidMix = cashShare + checkShare;
  const profitCash = paidMix > 0 ? totalProfit * (cashShare / paidMix) : 0;
  const profitCheck = paidMix > 0 ? totalProfit * (checkShare / paidMix) : 0;

  const sellPrices = [...priceQty.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([price, count]) => ({ price, count }));

  return ok(
    serialize({
      finishedUnit,
      listUnit,
      soldQty,
      returnedQty,
      netQty,
      revenue,
      cogs,
      totalProfit,
      avgSell,
      cashShare,
      checkShare,
      profitCash,
      profitCheck,
      sellPrices,
      sales,
    }),
  );
}
