import { clothExtrasTotal } from './cloth-extras';
import { fabricExtrasTotal } from './fabric-extras';

export type FabricCostInput = {
  amount?: number | string | null;
  priceForUnit?: number | string | null;
  priceForShipingForUnit?: number | string | null;
  discount?: number | string | null;
  extras?: unknown;
};

export function fabricLotTotal(fabric: FabricCostInput): number {
  const amount = Number(fabric.amount || 0);
  const unit = Number(fabric.priceForUnit || 0);
  const shipping = Number(fabric.priceForShipingForUnit || 0);
  const discount = Number(fabric.discount || 0);
  const extras = fabricExtrasTotal(fabric.extras);
  return Math.max(0, amount * unit + amount * shipping - discount + extras);
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
  extras?: unknown;
}): number {
  const fromFabric = Number(cloth.amountUsed || 0) * fabricUnitCost(cloth._producedFrom);
  const base = fromFabric > 0 ? fromFabric : Number(cloth.boughtFee || 0);
  return Math.max(0, base + clothExtrasTotal(cloth.extras));
}

/** Full finished unit cost: fabric/buy + tailor/wash/trim/print fees + extras. */
export function clothFinishedUnitCost(cloth: {
  isProduced?: boolean | string | number | null;
  amountUsed?: number | string | null;
  _producedFrom?: unknown;
  boughtFee?: number | string | null;
  tailorFee?: number | string | null;
  washFee?: number | string | null;
  trimFee?: number | string | null;
  printFee?: number | string | null;
  extras?: unknown;
}): number {
  const produced =
    cloth.isProduced === true || cloth.isProduced === 'true' || cloth.isProduced === 1;
  const extras = clothExtrasTotal(cloth.extras);
  if (produced) {
    const fromFabric = Number(cloth.amountUsed || 0) * fabricUnitCost(cloth._producedFrom);
    const base = fromFabric > 0 ? fromFabric : Number(cloth.boughtFee || 0);
    return Math.max(
      0,
      base +
        Number(cloth.tailorFee || 0) +
        Number(cloth.washFee || 0) +
        Number(cloth.trimFee || 0) +
        Number(cloth.printFee || 0) +
        extras,
    );
  }
  return Math.max(0, Number(cloth.boughtFee || 0) + extras);
}

export function clothPayTotal(
  cloth: { count?: number | string | null },
  fee?: number | string | null,
) {
  return Math.max(0, Number(fee || 0) * Number(cloth.count || 0));
}
