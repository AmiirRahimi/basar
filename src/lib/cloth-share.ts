import { idList } from './partners';

export type ClothShareRef = {
  sellInAllStores?: boolean;
  _brandIds?: unknown;
  _storeIds?: unknown;
  _brandId?: unknown;
  _storeId?: unknown;
};

export function clothBrandIds(cloth: ClothShareRef): string[] {
  const ids = idList(cloth._brandIds);
  if (ids.length) return ids;
  return idList(cloth._brandId);
}

export function clothStoreIds(cloth: ClothShareRef): string[] {
  if (Array.isArray(cloth._storeIds)) return idList(cloth._storeIds);
  return idList(cloth._storeId);
}

export function clothAppliesToStore(cloth: ClothShareRef | null | undefined, storeId: string, brandId?: string): boolean {
  if (!cloth) return false;
  const brands = clothBrandIds(cloth);
  const stores = clothStoreIds(cloth);
  if (cloth.sellInAllStores) {
    if (brands.length) return Boolean(brandId && brands.includes(brandId));
    return Boolean(storeId && (stores.includes(storeId) || idList(cloth._storeId).includes(storeId)));
  }
  if (stores.length) return Boolean(storeId && stores.includes(storeId));
  if (brands.length) return Boolean(brandId && brands.includes(brandId));
  return Boolean(storeId && idList(cloth._storeId).includes(storeId));
}

export function clothShareLabel(
  cloth: ClothShareRef,
  brands: { _id: string; name?: string }[],
  stores: { _id: string; name?: string; _brandId?: string }[],
): string {
  if (cloth.sellInAllStores) return 'همه برندها و فروشگاه‌ها';
  const storeIds = clothStoreIds(cloth);
  if (storeIds.length) {
    return storeIds
      .map((id) => {
        const store = stores.find((row) => row._id === id);
        const brand = brands.find((row) => row._id === store?._brandId);
        return [brand?.name, store?.name].filter(Boolean).join(' / ') || 'فروشگاه';
      })
      .join('، ');
  }
  const brandIds = clothBrandIds(cloth);
  if (brandIds.length) {
    const names = brandIds.map((id) => brands.find((row) => row._id === id)?.name || 'برند');
    return `همه فروشگاه‌های ${names.join('، ')}`;
  }
  return '—';
}
