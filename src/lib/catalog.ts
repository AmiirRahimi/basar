import { DEFAULT_MOQ } from './constants';
import { clothUnitPrice } from './cloth-price';
import { packsFromCloth, totalItems } from './packs';
import { isTruthyFlag, saleState } from './product-sale';
import type { CatalogFilters, CatalogProduct, Cloth } from './types';

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1558171813-4c088753af8f?auto=format&fit=crop&w=1400&q=80';

function relation(value: Cloth['_type'] | Cloth['_style'] | Cloth['_size'] | Cloth['_color']) {
  if (!value) return { id: undefined as string | undefined, name: undefined as string | undefined };
  if (typeof value === 'string') return { id: value, name: undefined as string | undefined };
  return { id: value._id, name: value.name };
}

export function clothToProduct(cloth: Cloth): CatalogProduct {
  const type = relation(cloth._type);
  const style = relation(cloth._style);
  const color = relation(cloth._color);
  const size = relation(cloth._size);
  const stock = packsFromCloth(cloth);
  const images = (cloth.images || []).map((url) => String(url || '').trim()).filter(Boolean);
  const listPrice = clothUnitPrice(cloth);
  const sale = saleState({ ...cloth, wholesalePrice: listPrice });
  return {
    id: cloth._id,
    code: String(cloth.code ?? cloth._id),
    name: [type.name, style.name].filter(Boolean).join(' ') || `لباس ${cloth.code ?? ''}`.trim(),
    description: cloth.description || 'موجودی جین پوش — فروش عمده با بسته از حجره بازار بزرگ.',
    category: type.name || 'پوشاک',
    style: style.name,
    wholesalePrice: sale.salePrice,
    listPrice: sale.listPrice,
    onSale: sale.active,
    discountPercent: sale.percent,
    saleEndsAt: sale.endsAt,
    newCollection: isTruthyFlag(cloth.newCollection),
    minOrderQty: DEFAULT_MOQ,
    count: totalItems(stock.packs) || Number(cloth.count || 0),
    image: images[0] || FALLBACK_IMAGE,
    images: images.length ? images : [FALLBACK_IMAGE],
    color: color.name,
    size: size.name,
    packSize: stock.packSize,
    packs: stock.packs,
    categoryId: type.id,
    styleId: style.id,
    sizeId: size.id,
    colorId: color.id,
  };
}

export function uniqueFilterOptions(products: CatalogProduct[]) {
  const collect = (key: 'category' | 'style' | 'size' | 'color', idKey: 'categoryId' | 'styleId' | 'sizeId' | 'colorId') => {
    const map = new Map<string, string>();
    for (const product of products) {
      const id = product[idKey];
      const label = product[key];
      if (id && label) map.set(id, label);
    }
    return [...map.entries()].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label, 'fa'));
  };
  return {
    types: collect('category', 'categoryId'),
    styles: collect('style', 'styleId'),
    sizes: collect('size', 'sizeId'),
    colors: collect('color', 'colorId'),
  };
}

export function filterCatalog(products: CatalogProduct[], filters: CatalogFilters): CatalogProduct[] {
  const q = String(filters.q || '').trim().toLowerCase();
  const minPrice = Number(filters.minPrice || 0);
  const maxPrice = Number(filters.maxPrice || 0);
  return products.filter((product) => {
    if (q) {
      const hay = [product.name, product.code, product.category, product.style, product.color, product.size]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (filters.type && product.categoryId !== filters.type) return false;
    if (filters.style && product.styleId !== filters.style) return false;
    if (filters.size && product.sizeId !== filters.size) return false;
    if (filters.color && product.colorId !== filters.color) return false;
    if (minPrice > 0 && product.wholesalePrice < minPrice) return false;
    if (maxPrice > 0 && product.wholesalePrice > maxPrice) return false;
    if (filters.stock === 'in' && product.count < 1) return false;
    if (filters.sale === '1' && !product.onSale) return false;
    if (filters.new === '1' && !product.newCollection) return false;
    return true;
  });
}

export function newFromCatalog(products: CatalogProduct[]) {
  return products.filter((product) => product.newCollection);
}

export function saleFromCatalog(products: CatalogProduct[]) {
  return products.filter((product) => product.onSale);
}

export function colorsFromCatalog(products: CatalogProduct[]) {
  const map = new Map<string, { id: string; name: string; image: string; count: number }>();
  for (const product of products) {
    const id = product.colorId || product.color;
    if (!id || !product.color) continue;
    const current = map.get(id);
    if (current) {
      current.count += 1;
      continue;
    }
    map.set(id, { id, name: product.color, image: product.image, count: 1 });
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'fa'));
}

export function collectionsFromCatalog(products: CatalogProduct[]) {
  const map = new Map<string, { id: string; name: string; image: string; count: number }>();
  for (const product of products) {
    const id = product.categoryId || product.category;
    const current = map.get(id);
    if (current) {
      current.count += 1;
      continue;
    }
    map.set(id, { id, name: product.category, image: product.image, count: 1 });
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'fa'));
}

export function collectionsForSeo(
  products: CatalogProduct[],
  kinds: { id: string; name: string }[] = [],
) {
  const map = new Map<string, { id: string; name: string; image: string; count: number }>();
  for (const collection of collectionsFromCatalog(products)) {
    map.set(collection.id, collection);
  }
  for (const kind of kinds) {
    if (!kind.id || map.has(kind.id)) continue;
    map.set(kind.id, { id: kind.id, name: kind.name, image: FALLBACK_IMAGE, count: 0 });
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'fa'));
}
