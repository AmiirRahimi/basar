import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

type Doc = Record<string, any>;
type DB = Record<string, Doc[]>;

const FILE = path.join(process.cwd(), '.data', 'basar.json');

function load(): DB {
  try {
    return JSON.parse(fs.readFileSync(FILE, 'utf8')) as DB;
  } catch {
    return {};
  }
}

function save(db: DB) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(db, null, 2));
}

let state: DB = load();

function id() {
  return randomBytes(12).toString('hex');
}

function eq(a: unknown, b: unknown) {
  return String(a) === String(b);
}

function matches(doc: Doc, filter: Doc) {
  return Object.entries(filter || {}).every(([key, value]) => {
    if (typeof value === 'boolean') return Boolean(doc[key]) === value;
    if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      if ('$gte' in value || '$gt' in value) {
        const t = new Date(doc[key]).getTime();
        if (value.$gte && t < new Date(value.$gte).getTime()) return false;
        if (value.$gt && t <= new Date(value.$gt).getTime()) return false;
        return true;
      }
    }
    return eq(doc[key], value);
  });
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
  _boughtFrom: 'people',
  _returnedPerson: 'people',
  _person: 'people',
  _type: 'clothkinds',
  _clothKind: 'clothkinds',
  _size: 'sizes',
  _color: 'colors',
  _cloth: 'clothes',
  _invoice: 'invoices',
  _check: 'checks',
  _producedFrom: 'fabrics',
  _permision: 'permisions',
};

class Query {
  private pops: any[] = [];
  private sortKey = '';
  private skipN = 0;
  private limitN = 0;
  constructor(
    private rows: Doc[],
    private single = false,
  ) {}
  populate(p: any) {
    this.pops = this.pops.concat(Array.isArray(p) ? p : [p]);
    return this;
  }
  sort(key: string) {
    this.sortKey = key;
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
  select() {
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
    if (this.sortKey) {
      const desc = this.sortKey.startsWith('-');
      const key = desc ? this.sortKey.slice(1) : this.sortKey;
      rows.sort((a, b) => {
        if (a[key] < b[key]) return desc ? 1 : -1;
        if (a[key] > b[key]) return desc ? -1 : 1;
        return 0;
      });
    }
    if (this.skipN) rows = rows.slice(this.skipN);
    if (this.limitN) rows = rows.slice(0, this.limitN);
    for (const pop of this.pops) {
      const spec = typeof pop === 'string' ? { path: pop } : pop;
      const from = POP[spec.path];
      if (!from) continue;
      rows = rows.map((row) => {
        const related = (state[from] || []).find((item) => eq(item._id, row[spec.path]));
        return { ...row, [spec.path]: related || row[spec.path] };
      });
    }
    return this.single ? rows[0] || null : rows;
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
  async findByIdAndUpdate(idValue: string, payload: Doc) {
    const row = await this.findOneAndUpdate({ _id: idValue }, payload);
    if (!row) return null;
    return Object.assign(row, {
      select: () => ({ lean: async () => row }),
      lean: async () => row,
    });
  }
  async findByIdAndDelete(idValue: string) {
    state[this.name] = this.all().filter((d) => !eq(d._id, idValue));
    save(state);
    return { _id: idValue };
  }
  async findOneAndUpdate(filter: Doc, payload: Doc) {
    const i = this.all().findIndex((d) => matches(d, filter));
    if (i < 0) return null;
    this.all()[i] = { ...this.all()[i], ...payload };
    save(state);
    return mutateable(this.name, this.all()[i]);
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
  OTP: new FileModel('otps'),
  Store: new FileModel('stores'),
  StoreBranch: new FileModel('storebranches'),
  Person: new FileModel('people'),
  ClothKind: new FileModel('clothkinds'),
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
};
