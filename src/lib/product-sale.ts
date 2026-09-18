const MAX_DISCOUNT = 90;

export type SaleInput = {
  wholesalePrice?: number;
  onSale?: boolean | string | number;
  discountPercent?: number | string;
  saleEndsAt?: string | Date | null;
};

export function isTruthyFlag(value: unknown) {
  return value === true || value === 'true' || value === '1' || value === 1;
}

export function clampDiscountPercent(value: unknown) {
  const percent = Math.trunc(Number(value || 0));
  if (!Number.isFinite(percent)) return 0;
  return Math.min(MAX_DISCOUNT, Math.max(0, percent));
}

export function saleEndsAtMs(value: unknown) {
  if (!value) return 0;
  const time = new Date(value as string | Date).getTime();
  return Number.isFinite(time) ? time : 0;
}

export function saleState(input: SaleInput) {
  const listPrice = Math.max(0, Number(input.wholesalePrice || 0));
  const percent = clampDiscountPercent(input.discountPercent);
  const endMs = saleEndsAtMs(input.saleEndsAt);
  const timedOut = endMs > 0 && endMs <= Date.now();
  const active = isTruthyFlag(input.onSale) && percent > 0 && !timedOut;
  const salePrice = active ? Math.max(0, Math.round(listPrice * (1 - percent / 100))) : listPrice;
  return {
    active,
    percent: active ? percent : 0,
    listPrice,
    salePrice,
    endsAt: active && endMs > Date.now() ? new Date(endMs).toISOString() : '',
    showTimer: active && endMs > Date.now(),
  };
}
