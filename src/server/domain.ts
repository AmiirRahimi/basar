import mongoose from 'mongoose';
import { fabricLotTotal, fabricUnitCost, clothPayTotal } from '@/lib/cloth-price';
import { isPayablePersonRole, personRoleLabel } from '@/lib/constants';
import { checkAvailableToTransfer, dueDateMonthKey, paymentApplied, PERSIAN_MONTHS, persianYearMonth, statusToFlags } from '@/lib/checks';
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
    $or: [{ _storeId: oid(session._storeId) }, { _storeIds: oid(session._storeId) }],
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
    if (resource === 'check') {
      return ok(serialize(await markUsedChecks(auth.session, data as any[])));
    }
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
  body.sellInAllStores = false;
  body._brandId = oid(session._brandId);
  body._storeIds = [oid(session._storeId)];
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
  if (!cloth) return false;
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
  if (resource === 'check') {
    const checked = await applyCheckPayload(auth.session, body, false);
    if (!checked.ok) return checked;
    body = (checked.data || body) as Record<string, unknown>;
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
    const doc = {
      _storeId: oid(auth.session._storeId),
      _invoice: item._invoice ? oid(item._invoice) : undefined,
      _person: oid(item._person),
      _check: oid(checkIds[0]),
      _checks: checkIds.map((id) => oid(id)),
      cash,
      cashAmount: cash,
      checkAmount,
      creditAmount,
      discount,
      description: item.description,
      isDeleted: false,
    };
    created.push(doc);
  }
  await M().Payment.insertMany(created);
  return ok(serialize(created[0] || null), 'پرداخت ثبت شد');
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

function relationKey(value: unknown) {
  if (!value) return '';
  if (typeof value === 'object' && value && '_id' in (value as object)) return String((value as { _id: unknown })._id);
  return String(value);
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
    }),
  );
}

export async function personAccount(personId: string): Promise<ActionResult> {
  const auth = await withSession();
  if ('error' in auth) return auth.error;
  const person = await M().Person.findOne(storeFilter(auth.session, { _id: personId })).lean();
  if (!person) return fail('شخص پیدا نشد', 404);
  const role = String(person.role || '1');
  const payments = await M().Payment.find(storeFilter(auth.session, { _person: oid(personId) }))
    .populate('_check')
    .populate('_invoice')
    .lean();
  const paidTotal = payments.reduce((sum: number, row: any) => sum + paymentApplied(row), 0);

  if (isPayablePersonRole(role)) {
    const items = await vendorItems(auth.session, personId, role);
    const owedTotal = items.reduce((sum, row) => sum + Number(row.total || 0), 0);
    return ok(
      serialize({
        person,
        kind: 'payable',
        role,
        roleLabel: personRoleLabel(role),
        items,
        invoices: [],
        payments,
        purchaseTotal: owedTotal,
        owedTotal,
        paidTotal,
        remaining: Math.max(0, owedTotal - paidTotal),
      }),
    );
  }

  const [invoices, totals] = await Promise.all([
    M().Invoice.find(storeFilter(auth.session, { _client: oid(personId) })).lean(),
    cartTotalsMap(auth.session),
  ]);
  const invoiceRows = invoices
    .map((invoice: any) => {
      const total = totals[relationKey(invoice._id)] || 0;
      const related = payments.filter((row: any) => relationKey(row._invoice) === relationKey(invoice._id));
      const paid = related.reduce((sum: number, row: any) => sum + paymentApplied(row), 0);
      return {
        _id: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        timeStamp: invoice.timeStamp,
        total,
        paid,
        remaining: Math.max(0, total - paid),
      };
    })
    .sort((a: any, b: any) => new Date(b.timeStamp).getTime() - new Date(a.timeStamp).getTime());
  const purchaseTotal = invoiceRows.reduce((sum, row) => sum + row.total, 0);
  return ok(
    serialize({
      person,
      kind: 'receivable',
      role,
      roleLabel: personRoleLabel(role),
      items: [],
      invoices: invoiceRows,
      payments,
      purchaseTotal,
      owedTotal: purchaseTotal,
      paidTotal,
      remaining: Math.max(0, purchaseTotal - paidTotal),
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
  const invoice = await M().Invoice.findOne(storeFilter(auth.session, { _id: invoiceId }))
    .populate('_client', '_id fullName')
    .lean();
  if (!invoice) return fail('فاکتور پیدا نشد', 404);
  const [lines, payments] = await Promise.all([
    M().CustomerCart.find({ _invoice: oid(invoiceId), isDeleted: false }).lean(),
    M().Payment.find({ _invoice: oid(invoiceId), isDeleted: false }).populate('_check').lean(),
  ]);
  const total = lines.reduce((sum: number, line: any) => sum + Number(line.count || 0) * Number(line.price || 0), 0);
  const paid = payments.reduce((sum: number, row: any) => sum + paymentApplied(row), 0);
  return ok(
    serialize({
      invoice,
      total,
      paid,
      remaining: Math.max(0, total - paid),
      payments,
    }),
  );
}
