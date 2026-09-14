import mongoose from 'mongoose';
import { db, dbEngine, serialize } from './db';
import * as mongo from './models';
import { fileModels } from './file-db';
import { fail, ok, type ActionResult } from './result';
import { requireSession, type Session } from './session';

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

async function withSession() {
  try {
    await db();
  } catch (error) {
    return {
      error: fail(error instanceof Error ? error.message : 'اتصال به پایگاه داده برقرار نشد', 500) as ActionResult,
    };
  }
  const auth = await requireSession();
  if ('error' in auth) return { error: auth.error as ActionResult };
  return { session: auth.session };
}

function lookups() {
  const m = M() as any;
  return {
    person: { model: m.Person, sort: 'fullName' },
    cloth: { model: m.Cloth, populate: mongo.CLOTH_POPULATE, sort: 'code' },
    invoice: { model: m.Invoice, populate: { path: '_client', select: '_id fullName city role address phoneNumber' }, sort: '-timeStamp' },
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

export async function listResource(resource: string, page = 1, skip = 50, extra = ''): Promise<ActionResult> {
  try {
    const auth = await withSession();
    if ('error' in auth) return auth.error;
    const cfg = lookups()[resource];
    if (!cfg) return fail('منبع ناشناخته');
    const filter = cfg.global ? {} : parseFilter(auth.session, extra);
    let q = cfg.model.find(filter);
    if (cfg.populate) q = q.populate(cfg.populate);
    if (cfg.sort) q = q.sort(cfg.sort);
    const rows = await q
      .skip((page - 1) * skip)
      .limit(skip)
      .lean();
    return ok(serialize(rows));
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
  const filter = cfg.global ? { _id: id } : storeFilter(auth.session, { _id: id });
  let q = cfg.model.findOne(filter);
  if (cfg.populate) q = q.populate(cfg.populate);
  const row = await q.lean();
  if (!row) return fail('پیدا نشد', 404);
  return ok(serialize(row));
}

function preparePayload(session: Session, resource: string, payload: Record<string, unknown>) {
  const next = { ...payload };
  Object.keys(next).forEach((key) => {
    if (!key.startsWith('_')) return;
    const converted = oid(next[key]);
    if (converted === undefined) delete next[key];
    else next[key] = converted;
  });
  const cfg = lookups()[resource];
  if (!cfg?.global) {
    next._storeId = oid(session._storeId);
    if (next.isDeleted == null) next.isDeleted = false;
  }
  return next;
}

export async function createResource(resource: string, payload: unknown): Promise<ActionResult> {
  const auth = await withSession();
  if ('error' in auth) return auth.error;
  const body = (payload || {}) as Record<string, unknown>;

  if (resource === 'invoice') {
    let invoiceNumber = Math.floor(10000 + Math.random() * 9000);
    while (await M().Invoice.exists({ invoiceNumber })) {
      invoiceNumber = Math.floor(10000 + Math.random() * 9000);
    }
    const items = Array.isArray(body.items) ? body.items : [];
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
    await created.populate('_client', '_id fullName city role address phoneNumber');
    return ok(serialize(created.toObject()), 'ثبت شد');
  }

  if (resource === 'customer-cart') {
    const created = await M().CustomerCart.create(preparePayload(auth.session, resource, body));
    await created.populate('_cloth');
    return ok(serialize(created.toObject()), 'ثبت شد');
  }

  const cfg = lookups()[resource];
  if (!cfg) return fail('منبع ناشناخته');
  const created = await cfg.model.create(preparePayload(auth.session, resource, body));
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
    await updated.populate('_client', '_id fullName city role address phoneNumber');
    return ok(serialize(updated.toObject()), 'ویرایش شد');
  }

  const body = preparePayload(auth.session, resource, raw);
  delete body._storeId;
  const cfg = resource === 'customer-cart' ? { model: M().CustomerCart, populate: { path: '_cloth' } } : lookups()[resource];
  if (!cfg) return fail('منبع ناشناخته');
  const filter = 'global' in cfg && cfg.global ? { _id: id } : { _id: id, _storeId: oid(auth.session._storeId) };
  const updated = await cfg.model.findOneAndUpdate(filter, body, { new: true });
  if (!updated) return fail('پیدا نشد', 404);
  if (cfg.populate) await updated.populate(cfg.populate);
  return ok(serialize(updated.toObject()), 'ویرایش شد');
}

export async function deleteResource(resource: string, id: string): Promise<ActionResult> {
  const auth = await withSession();
  if ('error' in auth) return auth.error;
  if (resource === 'color' || resource === 'size' || resource === 'cloth-kind' || resource === 'permision') {
    const cfg = lookups()[resource];
    await cfg.model.findByIdAndDelete(id);
    return ok(null, 'حذف شد');
  }
  const cfg = resource === 'customer-cart' ? { model: M().CustomerCart } : lookups()[resource];
  if (!cfg) return fail('منبع ناشناخته');
  await cfg.model.findOneAndUpdate({ _id: id, _storeId: oid(auth.session._storeId) }, { isDeleted: true });
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
    .select('_id code count description wholesalePrice minOrderQty images _type _size _color boughtFee tailorFee')
    .populate([{ path: '_type' }, { path: '_color' }, { path: '_size', select: '_id name' }])
    .sort('code')
    .limit(80)
    .lean();
  return ok(serialize(rows));
}

export async function getStore(): Promise<ActionResult> {
  const auth = await withSession();
  if ('error' in auth) return auth.error;
  const store = await M().Store.findOne({ _userId: auth.session._id }).lean();
  if (!store) return fail('فروشگاه پیدا نشد', 404);
  const branches = await M().StoreBranch.find({ _storeId: store._id, isDeleted: false }).lean();
  const main = branches.find((b) => b.isMain) || branches[0] || null;
  return ok(serialize({ ...store, branches, ...main }));
}

export async function addStoreBranch(payload: unknown, main = false): Promise<ActionResult> {
  const auth = await withSession();
  if ('error' in auth) return auth.error;
  const store = await M().Store.findOne({ _userId: auth.session._id });
  if (!store) return fail('فروشگاه پیدا نشد', 404);
  const body = (payload || {}) as Record<string, unknown>;
  const branch = await M().StoreBranch.create({
    ...body,
    _storeId: store._id,
    isMain: main,
    isDeleted: false,
  });
  return ok(serialize(branch.toObject()), 'شعبه اضافه شد');
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
  const body = payload as Record<string, unknown>;
  const created = await M().ReturnedItems.create({
    _returned: oid(body._returned),
    _cloth: oid(body._cloth),
    count: Number(body.count || 1),
  });
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
  if (auth.session.phonenumber === process.env.ADMIN_PHONENUMBER) return ok(['IS_ADMIN']);
  const owner = await M().Store.countDocuments({ _userId: auth.session._id, _id: oid(auth.session._storeId) });
  if (owner) return ok(['IS_OWNER']);
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

