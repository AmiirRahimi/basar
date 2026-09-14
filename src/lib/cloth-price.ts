export function fabricUnitCost(fabric: unknown): number {
  if (!fabric || typeof fabric !== 'object') return 0;
  const row = fabric as Record<string, unknown>;
  return Number(row.priceForUnit || 0) + Number(row.priceForShipingForUnit || 0);
}

export function clothUnitPrice(cloth: {
  amountUsed?: number | string | null;
  _producedFrom?: unknown;
  boughtFee?: number | string | null;
}): number {
  const fromFabric = Number(cloth.amountUsed || 0) * fabricUnitCost(cloth._producedFrom);
  if (fromFabric > 0) return fromFabric;
  return Number(cloth.boughtFee || 0);
}
