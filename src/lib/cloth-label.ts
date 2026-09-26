function textOf(value: unknown) {
  if (!value || typeof value !== 'object') return '';
  const name = (value as { name?: unknown }).name;
  return String(name || '').trim();
}

/** Same product title on accounting invoices and website order prints. */
export function clothLabel(cloth: unknown) {
  if (!cloth || typeof cloth !== 'object') return 'لباس';
  const row = cloth as { code?: unknown; name?: unknown; _type?: unknown; _style?: unknown };
  const label = [textOf(row._type), textOf(row._style)].filter(Boolean).join(' ');
  if (label) return label;
  if (row.name) return String(row.name);
  if (row.code) return `لباس ${row.code}`;
  return 'لباس';
}
