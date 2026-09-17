import type { StoreWarehouse } from './types';

export type { StoreWarehouse };

export function asStringList(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap((item) => asStringList(item));
  if (value == null || value === '') return [];
  return String(value)
    .split(/[\n,،|]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function newContactId(prefix = 'wh') {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

export function emptyWarehouse(partial?: Partial<StoreWarehouse>): StoreWarehouse {
  return {
    _id: String(partial?._id || newContactId()),
    name: partial?.name || '',
    address: partial?.address || '',
    city: String(partial?.city || ''),
    phonenumbers: asStringList(partial?.phonenumbers),
    landlines: asStringList(partial?.landlines),
  };
}

export function normalizeWarehouses(value: unknown): StoreWarehouse[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((row) => {
    if (!row || typeof row !== 'object') return [];
    const item = row as Record<string, unknown>;
    const phonenumbers = asStringList(item.phonenumbers ?? item.phones);
    const landlines = asStringList(item.landlines);
    const name = String(item.name || '').trim();
    const address = String(item.address || '').trim();
    const city = String(item.city || '');
    if (!name && !address && !city && !phonenumbers.length && !landlines.length) return [];
    return [
      {
        _id: String(item._id || newContactId()),
        name: name || 'انبار',
        address,
        city,
        phonenumbers,
        landlines,
      },
    ];
  });
}

export function storePhones(store?: { phones?: unknown; phonenumbers?: unknown } | null) {
  const phones = asStringList(store?.phones);
  return phones.length ? phones : asStringList(store?.phonenumbers);
}

export function normalizeStoreContacts(payload: Record<string, unknown>) {
  const phones = asStringList(payload.phones ?? payload.phonenumbers);
  const landlines = asStringList(payload.landlines);
  return {
    phones,
    landlines,
    warehouses: normalizeWarehouses(payload.warehouses),
    phonenumbers: phones.join('، '),
  };
}
