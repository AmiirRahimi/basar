import { itemsToPacks, mergePacks, packsToOrder, parsePacks, subtractPacks, totalItems, totalPacks, type ClothPack } from './packs';
import type { CatalogProduct, WholesaleCartItem } from './types';

export function parseImageList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item || '').trim()).filter(Boolean);
  if (typeof value !== 'string') return [];
  return value
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function normalizeCartItem(raw: unknown, product?: CatalogProduct | null): WholesaleCartItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const productId = String(row.productId || '');
  if (!productId) return null;
  const packs = mergePacks(parsePacks(row.packs));
  const takenOrder = Array.isArray(row.takenOrder)
    ? row.takenOrder.map((item) => Math.trunc(Number(item))).filter((item) => item > 0)
    : [];
  if (packs.length) {
    return {
      productId,
      packs,
      takenOrder: takenOrder.length ? takenOrder : packsToOrder(packs, product?.packSize || packs[0].items),
    };
  }
  const qty = Math.trunc(Number(row.qty || 0));
  if (qty > 0 && product) {
    const converted = itemsToPacks(qty, product.packSize || 1);
    return { productId, packs: converted, takenOrder: packsToOrder(converted, product.packSize || 1) };
  }
  return null;
}

export function cartLineTotal(product: CatalogProduct, packs: ClothPack[]) {
  return totalItems(packs) * Number(product.wholesalePrice || 0);
}

export function remainingStock(stock: ClothPack[], taken: ClothPack[]) {
  return subtractPacks(stock, taken) || [];
}

export function resolveCartLines(items: WholesaleCartItem[], catalog: CatalogProduct[]) {
  return items
    .map((item) => {
      const product = catalog.find((row) => row.id === item.productId);
      if (!product) return null;
      const packs = mergePacks(item.packs);
      const pieces = totalItems(packs);
      return {
        ...item,
        packs,
        takenOrder: item.takenOrder?.length ? item.takenOrder : packsToOrder(packs, product.packSize),
        product,
        pieces,
        packCount: totalPacks(packs),
        total: cartLineTotal(product, packs),
      };
    })
    .filter(Boolean) as Array<
    WholesaleCartItem & {
      product: CatalogProduct;
      pieces: number;
      packCount: number;
      total: number;
    }
  >;
}

export function cartTotals(lines: Array<{ packCount: number; pieces: number; total: number }>) {
  return lines.reduce(
    (sum, line) => ({
      packs: sum.packs + line.packCount,
      pieces: sum.pieces + line.pieces,
      amount: sum.amount + line.total,
    }),
    { packs: 0, pieces: 0, amount: 0 },
  );
}
