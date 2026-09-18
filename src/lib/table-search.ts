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

export function matchesTableSearch(row: unknown, query: string, extra = '') {
  const needle = normalizeSearch(query);
  if (!needle) return true;
  const haystack = normalizeSearch(`${collectSearchText(row)} ${extra}`);
  return haystack.includes(needle);
}

export function encodeListQuery(input: {
  q?: string;
  sort?: string;
  dir?: 'asc' | 'desc';
  filter?: Record<string, unknown>;
}) {
  const params = new URLSearchParams();
  if (input.filter && Object.keys(input.filter).length) {
    params.set('filter', JSON.stringify(input.filter));
  }
  const q = String(input.q || '').trim().slice(0, MAX_QUERY_LEN);
  if (q) params.set('q', q);
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
