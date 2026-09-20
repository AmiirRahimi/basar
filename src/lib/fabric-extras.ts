export const FABRIC_EXTRA_KINDS = [
  { value: 'warehousing', label: 'انبارداری' },
  { value: 'other', label: 'خرج‌های دیگر' },
] as const;

export type FabricExtraKind = (typeof FABRIC_EXTRA_KINDS)[number]['value'];

export type FabricExtra = {
  kind: FabricExtraKind | '';
  price: number;
  description?: string;
};

const KIND_SET = new Set<string>(FABRIC_EXTRA_KINDS.map((row) => row.value));

export function fabricExtraKindLabel(kind?: string | null) {
  return FABRIC_EXTRA_KINDS.find((row) => row.value === kind)?.label || kind || '—';
}

export function parseFabricExtras(value: unknown): FabricExtra[] {
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
        kind: (KIND_SET.has(kind) ? kind : '') as FabricExtraKind | '',
        price: Math.max(0, Number(item.price || 0)),
        description: String(item.description || '').trim(),
      } satisfies FabricExtra;
    })
    .filter(Boolean) as FabricExtra[];
}

export function encodeFabricExtras(rows: FabricExtra[]) {
  return JSON.stringify(
    rows.map((row) => ({
      kind: row.kind || '',
      price: Math.max(0, Number(row.price || 0)),
      description: String(row.description || '').trim(),
    })),
  );
}

export function fabricExtrasTotal(value: unknown) {
  return parseFabricExtras(value).reduce((sum, row) => sum + Number(row.price || 0), 0);
}

export function sanitizeFabricExtras(value: unknown): FabricExtra[] {
  return parseFabricExtras(value)
    .filter((row) => row.kind && Number(row.price || 0) > 0)
    .map((row) => ({
      kind: row.kind,
      price: Math.max(0, Number(row.price || 0)),
      description: row.description || '',
    }));
}
