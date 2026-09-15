import mongoose from 'mongoose';
import { fabricUnitCost } from '@/lib/cloth-price';
import { canWriteResource } from '@/lib/roles';
import { db, dbEngine, serialize } from './db';
import { fileModels } from './file-db';
import * as mongo from './models';
import { fail, ok, type ActionResult } from './result';
import type { Session } from './session';
import { withWorkspace } from './workspace';

function M() {
  return dbEngine() === 'file' ? fileModels : mongo;
}

function oid(value: unknown) {
  if (value == null || value === '') return undefined;
  const s = String(value);
  return mongoose.Types.ObjectId.isValid(s) ? new mongoose.Types.ObjectId(s) : value;
}

function storeFilter(session: Session, extra: Record<string, unknown> = {}) {
  return { _storeId: oid(session._storeId), isDeleted: false, ...extra };
}

function clothVisibleFilter(session: Session) {
  return {
    isDeleted: false,
    $or: [
      { sellInAllStores: true, _brandId: oid(session._brandId) },
      { _storeIds: oid(session._storeId) },
      { _storeId: oid(session._storeId) },
    ],
  };
}

async function withSession() {
  return withWorkspace();
}

function denyWrite(session: Session, resource: string) {
  if (!canWriteResource(session.storeRole, resource, session.isPlatformAdmin)) {
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
    check: { model: m.Check, populate: { path: '_owner', select: '_id fullName city address phoneNumber' }, sort: 'dueDate' },
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

function parseFilter(session: Session, extra = '') {
  let filters: Record<string, unknown> = {};
  if (extra.startsWith('filter=')) {
    try {
      filters = JSON.parse(decodeURIComponent(extra.slice(7)));
    } catch {
      filters = {};
    }
  }
  Object.keys(filters).forEach((key) => {
    if (key.startsWith('_')) filters[key] = oid(filters[key]);
  });
  return storeFilter(session, filters);
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
    const cfg = lookups()[resource];
    if (!cfg) return fail('منبع ناشناخته');
    const filter = cfg.global
      ? {}
      : resource === 'cloth'
        ? clothVisibleFilter(auth.session)
        : parseFilter(auth.session, extra);
    let q = cfg.model.find(filter);
    if (cfg.populate) q = q.populate(cfg.populate);
    if (cfg.sort) q = q.sort(cfg.sort);
    const rows = await q
      .skip((page - 1) * skip)
      .limit(skip)
      .lean();
    const data = resource === 'invoice' ? (rows as any[]).map(decorateInvoice) : rows;
    return ok(serialize(data));
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'خطای پایگاه داده', 500);
  }
}

export async function getResource(resource: string, id: string): Promise<ActionResult> {
  const auth = await withSession();
  if ('error' in auth) return auth.error;
  if (resource === 'customer-cart') {
    const lines = await M().CustomerCart.find({ _invoice: oid(id), isDeleted: false })
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
  const next = { ...payload };
  Object.keys(next).forEach((key) => {
    if (!key.startsWith('_')) return;
    if (key === '_storeIds') {
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
    if (next.isDeleted == null) next.isDeleted = false;
  }
  return next;
}

function applyClothAvailability(session: Session, body: Record<string, unknown>) {
  const all = body.sellInAllStores === true || body.sellInAllStores === 'true';
  body.sellInAllStores = all;
  body._brandId = oid(session._brandId);
  body._storeIds = all ? [] : convertIdList(body._storeIds).length ? convertIdList(body._storeIds) : [oid(session._storeId)];
  return body;
}

async function applyClothCost(body: Record<string, unknown>) {
  const fabricId = body._producedFrom;
  const amountUsed = Number(body.amountUsed || 0);
  if (!fabricId || !amountUsed) return body;
  const fabric = await M().Fabric.findOne({ _id: fabricId, isDeleted: false }).lean();
  if (!fabric) return body;
  body.boughtFee = amountUsed * fabricUnitCost(fabric);
  return body;
}

function lineClothId(item: any) {
  const value = item?._cloth;
  if (value && typeof value === 'object' && value && '_id' in value) return String(value._id);
  return String(value || '');
}

function clothSellsInStore(cloth: any, session: Session) {
  if (!cloth) return false;
  if (cloth.sellInAllStores && String(cloth._brandId) === String(session._brandId)) return true;
  const assigned = (cloth._storeIds || []).map((id: unknown) => String(id));
  if (assigned.includes(String(session._storeId))) return true;
  return String(cloth._storeId) === String(session._storeId);
}

async function changeStock(clothId: unknown, delta: number) {
  const id = typeof clothId === 'object' && clothId && '_id' in (clothId as object) ? (clothId as { _id: unknown })._id : clothId;
  const cloth = await M().Cloth.findOne({ _id: oid(id), isDeleted: false }).lean();
  if (!cloth) return fail('لباس پیدا نشد');
  const next = Number(cloth.count || 0) + delta;
  if (next < 0) return fail('موجودی این لباس کافی نیست');
  await M().Cloth.updateOne({ _id: cloth._id }, { count: next });
  return ok(null);
}

async function sellItems(session: Session, items: any[]) {
  const needed = new Map<string, number>();
  for (const item of items) {
    const id = lineClothId(item);
    if (!id) continue;
    needed.set(id, (needed.get(id) || 0) + Number(item.count || 0));
  }
  for (const [id, qty] of needed) {
    const cloth = await M().Cloth.findOne({ _id: oid(id), isDeleted: false }).lean();
    if (!cloth) return fail('لباس پیدا نشد');
    if (!clothSellsInStore(cloth, session)) return fail('این لباس در این فروشگاه قابل فروش نیست');
    if (Number(cloth.count || 0) < qty) return fail('موجودی این لباس کافی نیست');
  }
  for (const [id, qty] of needed) {
    const result = await changeStock(id, -qty);
    if (!result.ok) return result;
  }
  return ok(null);
}

async function restoreItems(items: any[]) {
  for (const item of items) {
    const id = lineClothId(item);
    if (!id) continue;
    await changeStock(id, Number(item.count || 0));
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
    let invoiceNumber = Math.floor(10000 + Math.random() * 9000);
    while (await M().Invoice.exists({ invoiceNumber })) {
      invoiceNumber = Math.floor(10000 + Math.random() * 9000);
    }
    const created = await M().Invoice.create(
      preparePayload(auth.session, resource, { ...body, items: undefined, invoiceNumber }),
    );
    if (items.length) {
      await M().CustomerCart.insertMany(
        items.map((item: any) => ({
          ...preparePayload(auth.session, 'customer-cart', item),
          _invoice: created._id,
        })),
      );
    }
    await created.populate([
      { path: '_client', select: '_id fullName city role address phoneNumber' },
      { path: '_storeId', select: '_id name _brandId', populate: { path: '_brandId', select: '_id name color' } },
    ]);
    return ok(serialize(decorateInvoice(created.toObject())), 'ثبت شد');
  }

  if (resource === 'customer-cart') {
    const sold = await sellItems(auth.session, [body]);
    if (!sold.ok) return sold;
    const created = await M().CustomerCart.create(preparePayload(auth.session, resource, body));
    await created.populate('_cloth');
    return ok(serialize(created.toObject()), 'ثبت شد');
  }

  const cfg = lookups()[resource];
  if (!cfg) return fail('منبع ناشناخته');
  let next = preparePayload(auth.session, resource, body);
  if (resource === 'cloth') {
    next = applyClothAvailability(auth.session, next);
    next = await applyClothCost(next);
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
      const previous = await M().CustomerCart.find({ _invoice: oid(id), isDeleted: false }).lean();
      await restoreItems(previous);
      const sold = await sellItems(auth.session, items.filter((item: any) => item && item._cloth));
      if (!sold.ok) {
        await restoreItems(
          previous.map((item: any) => ({ ...item, count: -Number(item.count || 0) })),
        );
        return sold;
      }
      await M().CustomerCart.updateMany(
        { _invoice: oid(id), _storeId: oid(auth.session._storeId) },
        { isDeleted: true },
      );
      const validItems = items.filter((item: any) => item && item._cloth);
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
    return ok(serialize(decorateInvoice(updated.toObject())), 'ویرایش شد');
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
  }

  let body = preparePayload(auth.session, resource, raw);
  delete body._storeId;
  if (resource === 'cloth') {
    body = applyClothAvailability(auth.session, body);
    body = await applyClothCost(body);
  }
  const cfg = resource === 'customer-cart' ? { model: M().CustomerCart, populate: { path: '_cloth' } } : lookups()[resource];
  if (!cfg) return fail('منبع ناشناخته');
  const filter =
    'global' in cfg && cfg.global
      ? { _id: id }
      : resource === 'cloth'
        ? { _id: id, ...clothVisibleFilter(auth.session) }
        : { _id: id, _storeId: oid(auth.session._storeId) };
  const updated = await cfg.model.findOneAndUpdate(filter, body, { new: true });
  if (!updated) return fail('پیدا نشد', 404);
  if (cfg.populate) await updated.populate(cfg.populate);
  return ok(serialize(updated.toObject()), 'ویرایش شد');
}

export async function deleteResource(resource: string, id: string): Promise<ActionResult> {
  const auth = await withSession();
  if ('error' in auth) return auth.error;
  const denied = denyWrite(auth.session, resource === 'customer-cart' ? 'customer-cart' : resource);
  if (denied && resource !== 'color' && resource !== 'size' && resource !== 'cloth-kind' && resource !== 'cloth-style' && resource !== 'permision') {
    return denied;
  }
  if (resource === 'color' || resource === 'size' || resource === 'cloth-kind' || resource === 'cloth-style' || resource === 'permision') {
    const cfg = lookups()[resource];
    await cfg.model.findByIdAndDelete(id);
    return ok(null, 'حذف شد');
  }
  if (resource === 'customer-cart') {
    const line = await M().CustomerCart.findOne({ _id: id, _storeId: oid(auth.session._storeId) }).lean();
    if (line && !line.isDeleted) await restoreItems([line]);
  }
  if (resource === 'invoice') {
    const lines = await M().CustomerCart.find({ _invoice: oid(id), isDeleted: false }).lean();
    await restoreItems(lines);
  }
  const cfg = resource === 'customer-cart' ? { model: M().CustomerCart } : lookups()[resource];
  if (!cfg) return fail('منبع ناشناخته');
  const filter = resource === 'cloth' ? { _id: id, ...clothVisibleFilter(auth.session) } : { _id: id, _storeId: oid(auth.session._storeId) };
  await cfg.model.findOneAndUpdate(filter, { isDeleted: true });
  if (resource === 'invoice') {
    await M().CustomerCart.updateMany({ _invoice: oid(id), _storeId: oid(auth.session._storeId) }, { isDeleted: true });
  }
  if (resource === 'returned') {
    await M().ReturnedItems.updateMany({ _returned: oid(id) }, { isDeleted: true });
  }
  return ok(null, 'حذف شد');
}

export async function listPublicClothes(): Promise<ActionResult> {
  await db();
  const rows = await M().Cloth.find({ isDeleted: false, published: true })
    .select('_id code count description wholesalePrice minOrderQty images _type _style _size _color _producedFrom amountUsed boughtFee tailorFee')
    .populate([{ path: '_type' }, { path: '_style' }, { path: '_color' }, { path: '_size', select: '_id name' }, { path: '_producedFrom' }])
    .sort('code')
    .limit(80)
    .lean();
  return ok(serialize(rows));
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
  const filter = type === '1' ? { _invoice: oid(id), isDeleted: false } : { _person: oid(id), isDeleted: false };
  const rows = await M().Payment.find(filter)
    .populate({ path: '_check', populate: { path: '_owner' } })
    .populate(type === '1' ? '_invoice' : '_person')
    .skip((page - 1) * skip)
    .limit(skip)
    .lean();
  return ok(serialize(rows));
}

export async function createPayment(info: unknown): Promise<ActionResult> {
  const auth = await withSession();
  if ('error' in auth) return auth.error;
  const denied = denyWrite(auth.session, 'payment');
  if (denied) return denied;
  const items = Array.isArray(info) ? info : [info];
  const docs = items.map((item: any) => ({
    ...item,
    _storeId: oid(auth.session._storeId),
    _invoice: oid(item._invoice),
    _person: oid(item._person || item._invoice),
    cashAmount: item.cashAmount ?? item.cash,
    isDeleted: false,
  }));
  await M().Payment.insertMany(docs);
  return ok(docs[0] ? serialize(docs[0]) : null, 'پرداخت ثبت شد');
}

export async function addReturnedItem(payload: unknown): Promise<ActionResult> {
  const auth = await withSession();
  if ('error' in auth) return auth.error;
  const denied = denyWrite(auth.session, 'returned');
  if (denied) return denied;
  const body = payload as Record<string, unknown>;
  const created = await M().ReturnedItems.create({
    _returned: oid(body._returned),
    _cloth: oid(body._cloth),
    count: Number(body.count || 1),
  });
  await changeStock(body._cloth, Number(body.count || 1));
  return ok(serialize(created.toObject()), 'ثبت شد');
}

export async function listAttachments(id: string): Promise<ActionResult> {
  const auth = await withSession();
  if ('error' in auth) return auth.error;
  const rows = await M().Attachment.find({ entityId: oid(id) }).lean();
  return ok(serialize(rows));
}

export async function deleteAttachment(id: string): Promise<ActionResult> {
  const auth = await withSession();
  if ('error' in auth) return auth.error;
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
  return fail('نوع نامعتبر');
}
