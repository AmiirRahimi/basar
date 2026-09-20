/** Share of each storefront gateway payment kept by the platform owner. */
export const GATEWAY_FEE_PERCENT = 0.8;

export const STOREFRONT_CHANNEL = 'storefront';

export function invoiceStatusLabel(row: { channel?: string; isSent?: boolean }) {
  if (String(row.channel || '') === STOREFRONT_CHANNEL) return 'پرداخت لینک';
  return row.isSent ? 'ارسال شده' : 'پیش‌نویس';
}

export function splitGatewayAmount(amount: number, feePercent = GATEWAY_FEE_PERCENT) {
  const total = Math.max(0, Math.round(Number(amount) || 0));
  const rate = Math.max(0, Number(feePercent) || 0) / 100;
  const platformFee = Math.round(total * rate);
  return {
    total,
    feePercent: Number(feePercent) || GATEWAY_FEE_PERCENT,
    platformFee,
    sellerPayout: Math.max(0, total - platformFee),
  };
}
