export type FabricCostInput = {
  amount?: number | string | null;
  priceForUnit?: number | string | null;
  priceForShipingForUnit?: number | string | null;
  discount?: number | string | null;
};

export function fabricLotTotal(fabric: FabricCostInput): number {
  const amount = Number(fabric.amount || 0);
  const unit = Number(fabric.priceForUnit || 0);
  const shipping = Number(fabric.priceForShipingForUnit || 0);
  const discount = Number(fabric.discount || 0);
  return Math.max(0, amount * unit + amount * shipping - discount);
}

export function fabricUnitCost(fabric: unknown): number {
  if (!fabric || typeof fabric !== 'object') return 0;
  const row = fabric as FabricCostInput & Record<string, unknown>;
  const amount = Number(row.amount || 0);
  const total = fabricLotTotal(row);
  if (amount > 0) return total / amount;
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

export function clothPayTotal(
  cloth: { count?: number | string | null },
  fee?: number | string | null,
) {
  return Math.max(0, Number(fee || 0) * Number(cloth.count || 0));
}
