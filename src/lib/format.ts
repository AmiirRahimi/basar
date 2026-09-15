export function displayName(value: unknown): string {
  if (value == null) return '—';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if (obj.fullName || obj.name || obj.code) {
      return String(obj.fullName || obj.name || obj.code);
    }
    if (obj._mercer) return displayName(obj._mercer);
    return String(obj._id || '—');
  }
  return '—';
}

export function faNumber(value?: number | string | null) {
  return new Intl.NumberFormat('fa-IR').format(Number(value || 0));
}

export function compactToman(value?: number | string | null) {
  const n = Number(value || 0);
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `${faNumber(Math.round(n / 1_000_000_000))} میلیارد`;
  if (abs >= 1_000_000) return `${faNumber(Math.round(n / 1_000_000))} میلیون`;
  if (abs >= 1_000) return `${faNumber(Math.round(n / 1_000))} هزار`;
  return faNumber(n);
}

export function toman(value?: number | string | null) {
  return `${faNumber(value)} تومان`;
}

export function faDate(value?: string | Date | number) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return new Intl.DateTimeFormat('fa-IR').format(d);
}
