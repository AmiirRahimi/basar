export function displayName(value: unknown): string {
  if (value == null) return '—';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    return String(obj.fullName || obj.name || obj.code || obj._id || '—');
  }
  return '—';
}

export function toman(value?: number | string | null) {
  const n = Number(value || 0);
  return `${new Intl.NumberFormat('fa-IR').format(n)} تومان`;
}

export function faDate(value?: string | Date | number) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return new Intl.DateTimeFormat('fa-IR').format(d);
}
