import { faNumber } from './format';

export type ClothPack = {
  /** How many clothes are inside one pack of this kind. */
  items: number;
  /** How many packs of this kind. */
  count: number;
};

export type PacksEditorValue = {
  packSize: number;
  packs: ClothPack[];
};

export function parsePacks(value: unknown): ClothPack[] {
  if (!Array.isArray(value)) return [];
  return mergePacks(
    value.map((row) => {
      const pack = row && typeof row === 'object' ? (row as Record<string, unknown>) : {};
      return {
        items: Number(pack.items || 0),
        count: Number(pack.count || 0),
      };
    }),
  );
}

export function mergePacks(packs: ClothPack[]): ClothPack[] {
  const map = new Map<number, number>();
  for (const pack of packs) {
    const items = Math.trunc(Number(pack.items || 0));
    const count = Math.trunc(Number(pack.count || 0));
    if (items < 1 || count < 1) continue;
    map.set(items, (map.get(items) || 0) + count);
  }
  return [...map.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([items, count]) => ({ items, count }));
}

export function totalItems(packs: ClothPack[]): number {
  return packs.reduce((sum, pack) => sum + pack.items * pack.count, 0);
}

export function totalPacks(packs: ClothPack[]): number {
  return packs.reduce((sum, pack) => sum + pack.count, 0);
}

export function packsFromCloth(cloth: {
  packs?: unknown;
  count?: unknown;
  packSize?: unknown;
}): { packSize: number; packs: ClothPack[] } {
  const packs = parsePacks(cloth.packs);
  const storedSize = Math.trunc(Number(cloth.packSize || 0));
  if (packs.length) {
    const inferred = Math.max(...packs.map((pack) => pack.items), 1);
    return { packSize: storedSize > 0 ? storedSize : inferred, packs };
  }
  const count = Math.trunc(Number(cloth.count || 0));
  if (count <= 0) return { packSize: storedSize > 0 ? storedSize : 1, packs: [] };
  if (storedSize > 0) return { packSize: storedSize, packs: itemsToPacks(count, storedSize) };
  return { packSize: 1, packs: [{ items: 1, count }] };
}

export function itemsToPacks(count: number, packSize: number): ClothPack[] {
  const qty = Math.trunc(Number(count || 0));
  const size = Math.trunc(Number(packSize || 0));
  if (qty <= 0) return [];
  if (size <= 1) return [{ items: 1, count: qty }];
  const complete = Math.floor(qty / size);
  const remainder = qty % size;
  const packs: ClothPack[] = [];
  if (complete) packs.push({ items: size, count: complete });
  if (remainder) packs.push({ items: remainder, count: 1 });
  return mergePacks(packs);
}

export function addPacks(stock: ClothPack[], incoming: ClothPack[]): ClothPack[] {
  return mergePacks([...stock, ...incoming]);
}

export function subtractPacks(stock: ClothPack[], taken: ClothPack[]): ClothPack[] | null {
  const next = new Map(mergePacks(stock).map((pack) => [pack.items, pack.count]));
  for (const pack of mergePacks(taken)) {
    const have = next.get(pack.items) || 0;
    if (have < pack.count) return null;
    const left = have - pack.count;
    if (left) next.set(pack.items, left);
    else next.delete(pack.items);
  }
  return [...next.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([items, count]) => ({ items, count }));
}

export function takePack(stock: ClothPack[], items: number): ClothPack[] | null {
  return subtractPacks(stock, [{ items, count: 1 }]);
}

export function remainingOf(stock: ClothPack[], items: number): number {
  return stock.find((pack) => pack.items === items)?.count || 0;
}

export function defaultPackToTake(stock: ClothPack[], packSize: number): number | null {
  if (remainingOf(stock, packSize) > 0) return packSize;
  const fullest = mergePacks(stock).find((pack) => pack.count > 0);
  return fullest ? fullest.items : null;
}

export function takeItemsAsPacks(stock: ClothPack[], qty: number, packSize: number): ClothPack[] | null {
  let remaining = mergePacks(stock);
  const taken: number[] = [];
  let need = Math.trunc(Number(qty || 0));
  if (need <= 0) return [];
  while (need > 0) {
    const preferred = defaultPackToTake(remaining, packSize);
    const fit =
      preferred != null && preferred <= need
        ? preferred
        : remaining.filter((pack) => pack.count > 0 && pack.items <= need).sort((a, b) => b.items - a.items)[0]?.items;
    if (fit == null) return null;
    const next = takePack(remaining, fit);
    if (!next) return null;
    remaining = next;
    taken.push(fit);
    need -= fit;
  }
  return orderToPacks(taken);
}

export function packsToOrder(packs: ClothPack[], packSize: number): number[] {
  const merged = mergePacks(packs);
  const order: number[] = [];
  const complete = merged.find((pack) => pack.items === packSize);
  if (complete) {
    for (let i = 0; i < complete.count; i += 1) order.push(packSize);
  }
  merged
    .filter((pack) => pack.items !== packSize)
    .sort((a, b) => b.items - a.items)
    .forEach((pack) => {
      for (let i = 0; i < pack.count; i += 1) order.push(pack.items);
    });
  return order;
}

export function orderToPacks(order: number[]): ClothPack[] {
  return mergePacks(order.map((items) => ({ items, count: 1 })));
}

function readPackRows(value: unknown): ClothPack[] {
  if (!Array.isArray(value)) return [];
  return value.map((row) => {
    const pack = row && typeof row === 'object' ? (row as Record<string, unknown>) : {};
    return {
      items: Math.trunc(Number(pack.items || 0)),
      count: Math.trunc(Number(pack.count || 0)),
    };
  });
}

export function parsePacksEditorValue(raw: unknown): PacksEditorValue {
  if (raw == null || raw === '') return { packSize: 0, packs: [] };
  let data: unknown = raw;
  if (typeof raw === 'string') {
    try {
      data = JSON.parse(raw);
    } catch {
      return { packSize: 0, packs: [] };
    }
  }
  if (!data || typeof data !== 'object') return { packSize: 0, packs: [] };
  const row = data as Record<string, unknown>;
  const packSize = Math.trunc(Number(row.packSize || 0));
  return { packSize: packSize > 0 ? packSize : 0, packs: readPackRows(row.packs ?? row.groups) };
}

export function encodePacksEditorValue(value: PacksEditorValue): string {
  return JSON.stringify({
    packSize: Number(value.packSize || 0),
    packs: value.packs,
  });
}

export function validatePacksEditor(value: PacksEditorValue): string | null {
  if (!value.packSize || value.packSize < 1) return 'تعداد هر بسته کامل را وارد کنید';
  if (!value.packs.length) return 'حداقل یک نوع بسته وارد کنید';
  for (const pack of value.packs) {
    if (pack.count < 1 || pack.items < 1) return 'تعداد بسته و تعداد داخل بسته باید بیشتر از صفر باشد';
    if (pack.items > value.packSize) return 'تعداد داخل بسته نمی‌تواند از بسته کامل بیشتر باشد';
  }
  return null;
}

export function formatPacksFa(packs: ClothPack[]): string {
  const merged = mergePacks(packs);
  if (!merged.length) return '—';
  return merged
    .map((pack) => `${faNumber(pack.count)} بسته ${faNumber(pack.items)} تایی`)
    .join('، ');
}

export function formatStockFa(packs: ClothPack[]): string {
  const merged = mergePacks(packs);
  if (!merged.length) return 'بدون موجودی';
  return `${formatPacksFa(merged)} — جمع ${faNumber(totalPacks(merged))} بسته، ${faNumber(totalItems(merged))} عدد`;
}

export function formatTakenFa(packs: ClothPack[]): string {
  const merged = mergePacks(packs);
  if (!merged.length) return 'چیزی اضافه نشده';
  return `افزوده شده: ${formatPacksFa(merged)} — جمع ${faNumber(totalItems(merged))} عدد`;
}
