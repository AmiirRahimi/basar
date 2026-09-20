export const CLOTH_EXTRA_KINDS = [
  { value: 'trim', label: 'خرجکار' },
  { value: 'print', label: 'چاپ' },
  { value: 'shipping', label: 'حمل و نقل' },
  { value: 'packaging', label: 'بسته بندی' },
  { value: 'other', label: 'خرج‌های دیگر' },
] as const;

export type ClothExtraKind = (typeof CLOTH_EXTRA_KINDS)[number]['value'];

export type ClothExtra = {
  kind: ClothExtraKind | '';
  price: number;
  description?: string;
};

const KIND_SET = new Set<string>(CLOTH_EXTRA_KINDS.map((row) => row.value));

export function clothExtraKindLabel(kind?: string | null) {
  return CLOTH_EXTRA_KINDS.find((row) => row.value === kind)?.label || kind || '—';
}

export function parseClothExtras(value: unknown): ClothExtra[] {
  if (!value) return [];
  let rows: unknown[] = [];
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      rows = Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  } else if (Array.isArray(value)) {
    rows = value;
  } else {
    return [];
  }
  return rows
    .map((row) => {
      if (!row || typeof row !== 'object') return null;
      const item = row as Record<string, unknown>;
      const kind = String(item.kind || '');
      return {
        kind: (KIND_SET.has(kind) ? kind : '') as ClothExtraKind | '',
        price: Math.max(0, Number(item.price || 0)),
        description: String(item.description || '').trim(),
      } satisfies ClothExtra;
    })
    .filter(Boolean) as ClothExtra[];
}

export function encodeClothExtras(rows: ClothExtra[]) {
  return JSON.stringify(
    rows.map((row) => ({
      kind: row.kind || '',
      price: Math.max(0, Number(row.price || 0)),
      description: String(row.description || '').trim(),
    })),
  );
}

export function clothExtrasTotal(value: unknown) {
  return parseClothExtras(value).reduce((sum, row) => sum + Number(row.price || 0), 0);
}

export function sanitizeClothExtras(value: unknown): ClothExtra[] {
  return parseClothExtras(value)
    .filter((row) => row.kind && Number(row.price || 0) > 0)
    .map((row) => ({
      kind: row.kind,
      price: Math.max(0, Number(row.price || 0)),
      description: row.description || '',
    }));
}
