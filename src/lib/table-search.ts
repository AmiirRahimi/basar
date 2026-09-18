import { CHECK_DIRECTIONS, CHECK_STATUSES, checkSourceLabel, checkStatus } from '@/lib/checks';
import { PERSON_ROLES, personRoleLabel } from '@/lib/constants';
import { displayName, faDate, toman } from '@/lib/format';

const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const SORT_KEY_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;
const MAX_QUERY_LEN = 200;

export function normalizeSearch(value: unknown) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[۰-۹]/g, (digit) => String(FA_DIGITS.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String(AR_DIGITS.indexOf(digit)))
    .replace(/\s+/g, ' ')
    .trim();
}

function collectSearchText(value: unknown, depth = 0, seen?: Set<unknown>): string {
  if (value == null || depth > 5) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (typeof value !== 'object') return '';
  const visited = seen || new Set<unknown>();
  if (visited.has(value)) return '';
  visited.add(value);
  if (Array.isArray(value)) {
    return value.map((item) => collectSearchText(item, depth + 1, visited)).join(' ');
  }
  const obj = value as Record<string, unknown>;
  const named = obj.fullName || obj.name || obj.code || obj.label;
  const parts = named ? [String(named)] : [];
  for (const [key, nested] of Object.entries(obj)) {
    if (key === '_id' || key.startsWith('__')) continue;
    parts.push(collectSearchText(nested, depth + 1, visited));
  }
  return parts.join(' ');
}

const MAX_SEARCH_FIELDS = 40;

function parseFieldList(value: unknown) {
  const raw = Array.isArray(value)
    ? value.map((item) => String(item || ''))
    : String(value || '').split(',');
  const seen = new Set<string>();
  const fields: string[] = [];
  for (const part of raw) {
    const key = part.trim();
    if (!SORT_KEY_RE.test(key) || seen.has(key)) continue;
    seen.add(key);
    fields.push(key);
    if (fields.length >= MAX_SEARCH_FIELDS) break;
  }
  return fields;
}

export function fieldSearchText(row: Record<string, any>, key: string, resource = '') {
  if (!key || key === 'actions' || !row) return '';
  const value = row[key];
  const parts: unknown[] = [sortColumnValue(row, key, resource), collectSearchText(value)];
  if (key === 'role' || (resource === 'person' && key === 'role')) {
    parts.push(PERSON_ROLES[String(row.role)] || personRoleLabel(row.role));
  }
  if (key === 'isSent') parts.push(row.isSent ? 'ارسال شده' : 'پیش‌نویس');
  if (key === 'timeStamp' || key === 'endDate' || key === 'startDate' || key === 'expiresAt') {
    parts.push(faDate(value));
  }
  if (key === 'unitPrice' || key === 'totalPrice' || key === 'amount' || key === 'price' || key.endsWith('Fee')) {
    if (value != null && value !== '') parts.push(toman(value));
  }
  if (resource === 'check' && key === 'direction') {
    parts.push(CHECK_DIRECTIONS[row.direction === 'out' ? 'out' : 'in']);
  }
  if (resource === 'check' && key === 'status') parts.push(CHECK_STATUSES[checkStatus(row)]);
  if (resource === 'check' && key === 'source') parts.push(checkSourceLabel(row));
  if (resource === 'check' && key === 'isTransferred') {
    parts.push(row.isTransferred ? 'بله واگذار شده' : 'خیر');
  }
  if (key === 'store') parts.push(row.storeName, row.brandName);
  if (key === 'active' || key === 'loggedIn' || key === 'published') {
    parts.push(value ? 'بله فعال' : 'خیر غیرفعال');
  }
  return parts.filter((part) => part != null && part !== '').join(' ');
}

export function matchesTableSearch(
  row: unknown,
  query: string,
  extra = '',
  fields?: string[],
  resource = '',
) {
  const needle = normalizeSearch(query);
  if (!needle) return true;
  if (Array.isArray(fields)) {
    if (!fields.length) return false;
    const haystack = fields
      .map((key) => fieldSearchText((row || {}) as Record<string, any>, key, resource))
      .join(' ');
    return normalizeSearch(haystack).includes(needle);
  }
  const haystack = normalizeSearch(`${collectSearchText(row)} ${extra}`);
  return haystack.includes(needle);
}

export function encodeListQuery(input: {
  q?: string;
  sort?: string;
  dir?: 'asc' | 'desc';
  filter?: Record<string, unknown>;
  fields?: string[];
}) {
  const params = new URLSearchParams();
  if (input.filter && Object.keys(input.filter).length) {
    params.set('filter', JSON.stringify(input.filter));
  }
  const q = String(input.q || '').trim().slice(0, MAX_QUERY_LEN);
  if (q) params.set('q', q);
  if (input.fields !== undefined) {
    params.set('fields', parseFieldList(input.fields).join(','));
  }
  if (input.sort && SORT_KEY_RE.test(input.sort)) {
    params.set('sort', input.sort);
    if (input.dir === 'desc') params.set('dir', 'desc');
  }
  return params.toString();
}

export function parseListQuery(extra = '') {
  const params = new URLSearchParams(extra);
  let filter: Record<string, unknown> = {};
  const raw = params.get('filter');
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) filter = parsed;
    } catch {
      filter = {};
    }
  }
  const sortRaw = String(params.get('sort') || '').trim();
  return {
    filter,
    q: String(params.get('q') || '').trim().slice(0, MAX_QUERY_LEN),
    sort: SORT_KEY_RE.test(sortRaw) ? sortRaw : '',
    dir: params.get('dir') === 'desc' ? ('desc' as const) : ('asc' as const),
    fields: params.has('fields') ? parseFieldList(params.get('fields')) : undefined,
  };
}

export function sortColumnValue(row: Record<string, any>, key: string, resource = '') {
  if (!key || key === 'actions') return '';
  if (key === 'store') {
    return `${row.brandName || ''} ${row.storeName || ''}`.trim() || displayName(row._storeId);
  }
  if (resource === 'check' && key === 'source') return checkSourceLabel(row);
  if (resource === 'check' && key === 'status') return checkStatus(row);
  if (resource === 'person' && key === 'role') return personRoleLabel(row.role) || String(row.role ?? '');
  const value = row[key];
  if (Array.isArray(value)) {
    return value
      .map((item) => (item && typeof item === 'object' ? displayName(item) : item))
      .join(' ');
  }
  if (value instanceof Date) return value.getTime();
  if (value && typeof value === 'object') {
    const label = displayName(value);
    return label === '—' ? '' : label;
  }
  return value;
}

export function compareSortValues(a: unknown, b: unknown) {
  const aEmpty = a == null || a === '';
  const bEmpty = b == null || b === '';
  if (aEmpty && bEmpty) return 0;
  if (aEmpty) return 1;
  if (bEmpty) return -1;
  if (typeof a === 'boolean' && typeof b === 'boolean') return Number(a) - Number(b);
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  const aTime =
    a instanceof Date ? a.getTime() : typeof a === 'string' && /^\d{4}-\d{2}/.test(a) ? Date.parse(a) : NaN;
  const bTime =
    b instanceof Date ? b.getTime() : typeof b === 'string' && /^\d{4}-\d{2}/.test(b) ? Date.parse(b) : NaN;
  if (!Number.isNaN(aTime) && !Number.isNaN(bTime)) return aTime - bTime;
  return String(a).localeCompare(String(b), 'fa', { numeric: true, sensitivity: 'base' });
}

export function tableRowSearchExtra(resource: string, row: Record<string, any>) {
  const parts: string[] = [];
  if (resource === 'person') {
    parts.push(PERSON_ROLES[String(row.role)] || '', row.phoneNumber, row.city, row.address);
  }
  if (resource === 'invoice') {
    parts.push(
      displayName(row._client),
      faDate(row.timeStamp),
      row.isSent ? 'ارسال شده' : 'پیش‌نویس',
      row.storeName,
      row.brandName,
      row.receiverAddress,
    );
  }
  if (resource === 'check') {
    const status = checkStatus(row);
    parts.push(
      CHECK_DIRECTIONS[row.direction === 'out' ? 'out' : 'in'],
      CHECK_STATUSES[status],
      checkSourceLabel(row),
      displayName(row._owner),
      row.isTransferred ? 'بله واگذار شده' : 'خیر',
      toman(row.amount),
      row.serialNumber,
      row.sayadiNumber,
      row.dueDate,
    );
  }
  if (resource === 'cloth') {
    parts.push(
      toman(row.unitPrice),
      row.packSummary,
      displayName(row._type),
      displayName(row._style),
      displayName(row._size),
      displayName(row._storeId),
    );
    if (row.onSale) parts.push('حراج تخفیف');
    if (row.newCollection) parts.push('کالکشن جدید');
  }
  if (resource === 'fabric') {
    parts.push(
      toman(row.totalPrice),
      toman(row.priceForUnit),
      displayName(row._mercer),
      displayName(row._tailor),
    );
  }
  if (row.timeStamp) parts.push(faDate(row.timeStamp));
  return parts.filter(Boolean).join(' ');
}
