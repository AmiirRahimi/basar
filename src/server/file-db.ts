import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

type Doc = Record<string, any>;
type DB = Record<string, Doc[]>;

const FILE = path.join(process.cwd(), '.data', 'basar.json');

let loadedAt = 0;

function fileMtime() {
  try {
    return fs.statSync(FILE).mtimeMs;
  } catch {
    return 0;
  }
}

function load(): DB {
  try {
    loadedAt = fileMtime() || Date.now();
    return JSON.parse(fs.readFileSync(FILE, 'utf8')) as DB;
  } catch {
    loadedAt = Date.now();
    return {};
  }
}

function save(db: DB) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(db, null, 2));
  loadedAt = fileMtime() || Date.now();
}

let state: DB = load();

function refresh() {
  const mtime = fileMtime();
  if (mtime && mtime > loadedAt) state = load();
}

function id() {
  return randomBytes(12).toString('hex');
}

function eq(a: unknown, b: unknown) {
  return String(a) === String(b);
}

function matchField(doc: Doc, key: string, value: unknown) {
  if (typeof value === 'boolean') return Boolean(doc[key]) === value;
  if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
    const op = value as Record<string, unknown>;
    if ('$in' in op) {
      const list = Array.isArray(op.$in) ? op.$in : [];
      const docVal = doc[key];
      if (Array.isArray(docVal)) return docVal.some((item) => list.some((candidate) => eq(item, candidate)));
      return list.some((candidate) => eq(docVal, candidate));
    }
    if ('$ne' in op) return !eq(doc[key], op.$ne);
    if ('$exists' in op) {
      const exists = doc[key] !== undefined && doc[key] !== null;
      return Boolean(op.$exists) === exists;
    }
    if ('$size' in op) {
      const n = Array.isArray(doc[key]) ? doc[key].length : 0;
      return n === Number(op.$size);
    }
    if ('$gte' in op || '$gt' in op || '$lte' in op || '$lt' in op) {
      const t = new Date(doc[key]).getTime();
      if (op.$gte && t < new Date(op.$gte as string | Date).getTime()) return false;
      if (op.$gt && t <= new Date(op.$gt as string | Date).getTime()) return false;
      if (op.$lte && t > new Date(op.$lte as string | Date).getTime()) return false;
      if (op.$lt && t >= new Date(op.$lt as string | Date).getTime()) return false;
      return true;
    }
  }
  if (Array.isArray(doc[key]) && !Array.isArray(value)) {
    return doc[key].some((item: unknown) => eq(item, value));
  }
  return eq(doc[key], value);
}

function matches(doc: Doc, filter: Doc) {
  if (!filter) return true;
  const { $or, $and, ...rest } = filter as Doc & { $or?: Doc[]; $and?: Doc[] };
  if ($or && !$or.some((part) => matches(doc, part))) return false;
  if ($and && !$and.every((part) => matches(doc, part))) return false;
  return Object.entries(rest).every(([key, value]) => matchField(doc, key, value));
}

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

const POP: Record<string, string> = {
  _client: 'people',
  _owner: 'people',
  _tailor: 'people',
  _mercer: 'people',
  _wash: 'people',
  _trim: 'people',
  _print: 'people',
  _boughtFrom: 'people',
  _returnedPerson: 'people',
  _person: 'people',
  _type: 'clothkinds',
  _style: 'clothstyles',
  _clothKind: 'clothkinds',
  _size: 'sizes',
  _color: 'colors',
  _cloth: 'clothes',
  _invoice: 'invoices',
  _check: 'checks',
  _sourceCheck: 'checks',
  _producedFrom: 'fabrics',
  _permision: 'permisions',
  _storeId: 'stores',
  _brandId: 'brands',
  _partner: 'partners',
  _sellerUserId: 'users',
  _userId: 'users',
};

function sortSpec(input: unknown): { key: string; desc: boolean } | null {
  if (!input) return null;
  if (typeof input === 'string') {
    const desc = input.startsWith('-');
    const key = desc ? input.slice(1) : input;
    return key ? { key, desc } : null;
  }
  if (typeof input === 'object' && !Array.isArray(input)) {
    const [key, direction] = Object.entries(input as Record<string, unknown>)[0] || [];
    if (!key) return null;
    return { key, desc: Number(direction) < 0 || direction === 'desc' };
  }
  return null;
}

function compareValues(a: unknown, b: unknown) {
  const aTime = a instanceof Date || (typeof a === 'string' && /^\d{4}-\d{2}/.test(a)) ? Date.parse(String(a)) : NaN;
  const bTime = b instanceof Date || (typeof b === 'string' && /^\d{4}-\d{2}/.test(b)) ? Date.parse(String(b)) : NaN;
  if (!Number.isNaN(aTime) && !Number.isNaN(bTime)) return aTime - bTime;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a ?? '').localeCompare(String(b ?? ''), 'fa');
}

function projectDoc(doc: Doc | null, spec?: string) {
  if (!doc || !spec) return doc;
  const parts = String(spec)
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  const exclude = parts.filter((part) => part.startsWith('-')).map((part) => part.slice(1));
  const include = parts.filter((part) => !part.startsWith('-') && part !== '_id');
  if (exclude.length) {
    const next = { ...doc };
    for (const key of exclude) delete next[key];
    return next;
  }
  if (!include.length) return doc;
  const next: Doc = { _id: doc._id };
  for (const key of include) {
    if (key in doc) next[key] = doc[key];
  }
  return next;
}

class Query {
  private pops: any[] = [];
  private sortInput: unknown = '';
  private skipN = 0;
  private limitN = 0;
  private selectSpec?: string;
  constructor(
    private rows: Doc[],
    private single = false,
  ) {}
  populate(p: any) {
    this.pops = this.pops.concat(Array.isArray(p) ? p : [p]);
    return this;
  }
  sort(key: unknown) {
    this.sortInput = key;
    return this;
  }
  skip(n: number) {
    this.skipN = n;
    return this;
  }
  limit(n: number) {
    this.limitN = n;
    return this;
  }
  select(spec?: string) {
    this.selectSpec = spec;
    return this;
  }
  lean() {
    return this;
  }
  then<T>(resolve: (v: any) => T, reject?: (e: unknown) => T) {
    return this.exec().then(resolve, reject);
  }
  async exec() {
    let rows = clone(this.rows);
    const order = sortSpec(this.sortInput);
    if (order) {
      rows.sort((a, b) => {
        const result = compareValues(a[order.key], b[order.key]);
        return order.desc ? -result : result;
      });
    }
    if (this.skipN) rows = rows.slice(this.skipN);
    if (this.limitN) rows = rows.slice(0, this.limitN);
    for (const pop of this.pops) {
      const spec = typeof pop === 'string' ? { path: pop } : pop;
      const from = POP[spec.path];
      if (!from) continue;
      rows = rows.map((row) => {
        const related = clone((state[from] || []).find((item) => eq(item._id, row[spec.path])) || null);
        const nested = spec.populate;
        if (related && nested) {
          const nestedList = Array.isArray(nested) ? nested : [nested];
          for (const child of nestedList) {
            const childFrom = POP[child.path];
            if (!childFrom) continue;
            related[child.path] =
              (state[childFrom] || []).find((item) => eq(item._id, related[child.path])) || related[child.path];
          }
        }
        return { ...row, [spec.path]: related || row[spec.path] };
      });
    }
    if (this.selectSpec) rows = rows.map((row) => projectDoc(row, this.selectSpec) as Doc);
    return this.single ? rows[0] || null : rows;
  }
}

class MutationQuery {
  private selectSpec?: string;
  private pending?: Promise<Doc | null>;
  constructor(private run: () => Doc | null) {}
  select(spec?: string) {
    this.selectSpec = spec;
    return this;
  }
  lean() {
    return this;
  }
  then<T>(resolve: (v: any) => T, reject?: (e: unknown) => T) {
    return this.exec().then(resolve, reject);
  }
  async exec() {
    if (!this.pending) this.pending = Promise.resolve().then(() => this.run());
    return projectDoc(await this.pending, this.selectSpec);
  }
}

function mutateable(name: string, doc: Doc) {
  const live = { ...doc };
  return Object.assign(live, {
    populate: async () => live,
    toObject: () => clone(live),
    save: async () => {
      const rows = state[name] || [];
      const i = rows.findIndex((d) => eq(d._id, live._id));
      if (i >= 0) rows[i] = { ...rows[i], ...live };
      save(state);
      return live;
    },
  });
}

export class FileModel {
  constructor(private name: string) {}

  private all() {
    refresh();
    if (!state[this.name]) state[this.name] = [];
    return state[this.name];
  }

  find(filter: Doc = {}) {
    return new Query(this.all().filter((d) => matches(d, filter)));
  }
  findOne(filter: Doc = {}) {
    return new Query(this.all().filter((d) => matches(d, filter)), true);
  }
  findById(idValue: string) {
    return this.findOne({ _id: idValue });
  }
  findByIdAndUpdate(idValue: string, payload: Doc, options?: Doc) {
    return this.findOneAndUpdate({ _id: idValue }, payload, options);
  }
  async findByIdAndDelete(idValue: string) {
    state[this.name] = this.all().filter((d) => !eq(d._id, idValue));
    save(state);
    return { _id: idValue };
  }
  findOneAndUpdate(filter: Doc, payload: Doc, _options?: Doc) {
    return new MutationQuery(() => {
      const i = this.all().findIndex((d) => matches(d, filter));
      if (i < 0) return null;
      this.all()[i] = { ...this.all()[i], ...payload };
      save(state);
      return mutateable(this.name, this.all()[i]);
    });
  }
  async updateOne(filter: Doc, payload: Doc) {
    await this.findOneAndUpdate(filter, payload);
    return { acknowledged: true };
  }
  async updateMany(filter: Doc, payload: Doc) {
    this.all().forEach((d, i) => {
      if (matches(d, filter)) this.all()[i] = { ...d, ...payload };
    });
    save(state);
  }
  async create(payload: Doc) {
    const doc = { _id: id(), timeStamp: new Date().toISOString(), ...payload };
    this.all().unshift(doc);
    save(state);
    return mutateable(this.name, doc);
  }
  async insertMany(items: Doc[]) {
    const created = items.map((item) => ({ _id: id(), timeStamp: new Date().toISOString(), ...item }));
    state[this.name] = [...created, ...this.all()];
    save(state);
    return created;
  }
  async countDocuments(filter: Doc = {}) {
    return this.all().filter((d) => matches(d, filter)).length;
  }
  async exists(filter: Doc) {
    return this.all().some((d) => matches(d, filter));
  }
}

export const fileModels = {
  User: new FileModel('users'),
  UserSubscription: new FileModel('usersubscriptions'),
  DiscountCode: new FileModel('discountcodes'),
  OTP: new FileModel('otps'),
  Brand: new FileModel('brands'),
  Store: new FileModel('stores'),
  StoreMember: new FileModel('storemembers'),
  Team: new FileModel('teams'),
  TeamMember: new FileModel('teammembers'),
  Partner: new FileModel('partners'),
  StoreBranch: new FileModel('storebranches'),
  Person: new FileModel('people'),
  ClothKind: new FileModel('clothkinds'),
  ClothStyle: new FileModel('clothstyles'),
  Color: new FileModel('colors'),
  Size: new FileModel('sizes'),
  Fabric: new FileModel('fabrics'),
  Cloth: new FileModel('clothes'),
  Invoice: new FileModel('invoices'),
  CustomerCart: new FileModel('customercarts'),
  Check: new FileModel('checks'),
  Payment: new FileModel('payments'),
  Returned: new FileModel('returneds'),
  ReturnedItems: new FileModel('returneditems'),
  Change: new FileModel('changes'),
  ChangedItems: new FileModel('changeditems'),
  Permision: new FileModel('permisions'),
  UserPermision: new FileModel('userpermisions'),
  Attachment: new FileModel('attachments'),
  ImageTokenPurchase: new FileModel('imagetokenpurchases'),
  ImageEdit: new FileModel('imageedits'),
  ProductShare: new FileModel('productshares'),
  PlanCatalog: new FileModel('plancatalogs'),
  PaymentIntent: new FileModel('paymentintents'),
  TelegramPublish: new FileModel('telegrampublishes'),
  TelegramInvite: new FileModel('telegraminvites'),
  SmsCampaign: new FileModel('smscampaigns'),
  Conversation: new FileModel('conversations'),
  ChatMessage: new FileModel('chatmessages'),
  MenuSearch: new FileModel('menusearches'),
};
