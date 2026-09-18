const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';

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
