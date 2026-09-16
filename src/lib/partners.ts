export type PartnerScopeKind = 'all' | 'brands' | 'stores';

export type PartnerRef = {
  _id: string;
  name: string;
  sharePercent?: number;
  allStores?: boolean;
  _brandIds?: unknown;
  _storeIds?: unknown;
  _brandId?: unknown;
  _storeId?: unknown;
  phonenumber?: string;
};

export type IncomeLine = {
  amount: number;
  partnerId?: string;
};

export type PartnerShareRow = {
  _id: string;
  name: string;
  sharePercent: number;
  clothAmount: number;
  shareAmount: number;
  total: number;
  scope: PartnerScopeKind;
};

export function idList(value: unknown): string[] {
  if (value == null || value === '') return [];
  const raw = Array.isArray(value) ? value : [value];
  const ids = raw.map((item) => {
    if (item == null || item === '') return '';
    if (typeof item === 'object' && item && '_id' in item) return String((item as { _id: unknown })._id);
    return String(item);
  });
  return [...new Set(ids.filter(Boolean))];
}

export function partnerStoreId(partner: { _storeId?: unknown }): string {
  const ids = idList(partner._storeId);
  return ids[0] || '';
}

export function partnerBrandIds(partner: PartnerRef): string[] {
  const ids = idList(partner._brandIds);
  if (ids.length) return ids;
  if (!partner.allStores && !idList(partner._storeIds).length && !partnerStoreId(partner)) {
    return idList(partner._brandId);
  }
  return ids;
}

export function partnerStoreIds(partner: PartnerRef): string[] {
  const ids = idList(partner._storeIds);
  const legacy = partnerStoreId(partner);
  if (legacy) ids.push(legacy);
  return [...new Set(ids)];
}

export function partnerScope(partner: PartnerRef): PartnerScopeKind {
  if (partner.allStores) return 'all';
  if (partnerStoreIds(partner).length) return 'stores';
  if (partnerBrandIds(partner).length) return 'brands';
  return 'stores';
}

export function partnerAppliesToStore(partner: PartnerRef, storeId: string, brandId?: string): boolean {
  if (partner.allStores) return true;
  const storeIds = partnerStoreIds(partner);
  if (storeIds.length) return Boolean(storeId && storeIds.includes(storeId));
  const brandIds = partnerBrandIds(partner);
  return Boolean(brandId && brandIds.includes(brandId));
}

export function partnersForStore<T extends PartnerRef>(partners: T[], storeId: string, brandId?: string): T[] {
  return partners.filter((partner) => partnerAppliesToStore(partner, storeId, brandId));
}

export function sharePercentTotal(partners: { sharePercent?: number }[]): number {
  return partners.reduce((sum, partner) => sum + Math.max(0, Number(partner.sharePercent || 0)), 0);
}

export function partnerScopeLabel(
  partner: PartnerRef,
  brands: { _id: string; name?: string }[],
  stores: { _id: string; name?: string; _brandId?: string }[],
): string {
  if (partner.allStores) return 'همه برندها و فروشگاه‌ها';
  const storeIds = partnerStoreIds(partner);
  if (storeIds.length) {
    return storeIds
      .map((id) => {
        const store = stores.find((row) => row._id === id);
        const brand = brands.find((row) => row._id === store?._brandId);
        return [brand?.name, store?.name].filter(Boolean).join(' / ') || 'فروشگاه';
      })
      .join('، ');
  }
  const brandIds = partnerBrandIds(partner);
  if (brandIds.length) {
    return brandIds.map((id) => brands.find((brand) => brand._id === id)?.name || 'برند').join('، ');
  }
  return '—';
}

export function allocateIncome(lines: IncomeLine[], partners: PartnerRef[]) {
  const rows = new Map<string, PartnerShareRow>();
  for (const partner of partners) {
    rows.set(String(partner._id), {
      _id: String(partner._id),
      name: partner.name,
      sharePercent: Math.max(0, Number(partner.sharePercent || 0)),
      clothAmount: 0,
      shareAmount: 0,
      total: 0,
      scope: partnerScope(partner),
    });
  }
  let pool = 0;
  let assigned = 0;
  for (const line of lines) {
    const amount = Math.max(0, Number(line.amount || 0));
    const row = rows.get(String(line.partnerId || ''));
    if (row) {
      row.clothAmount += amount;
      assigned += amount;
    } else {
      pool += amount;
    }
  }
  const percentSum = Math.min(100, sharePercentTotal([...rows.values()]));
  for (const row of rows.values()) {
    row.shareAmount = pool * (row.sharePercent / 100);
    row.total = row.clothAmount + row.shareAmount;
  }
  return {
    rows: [...rows.values()].sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, 'fa')),
    pool,
    assigned,
    ownerShare: pool * ((100 - percentSum) / 100),
    total: assigned + pool,
    percentSum,
  };
}
