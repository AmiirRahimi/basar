export const WHOLESALE_INVOICE_STATUSES = [
  { id: 'registered', label: 'ثبت شده' },
  { id: 'packing', label: 'در حال بسته‌بندی' },
  { id: 'ready', label: 'آماده ارسال' },
  { id: 'left', label: 'خارج از انبار' },
  { id: 'sent', label: 'ارسال شده' },
  { id: 'delivered', label: 'تحویل شده' },
] as const;

export type WholesaleInvoiceStatus = (typeof WHOLESALE_INVOICE_STATUSES)[number]['id'];

const IDS = new Set<string>(WHOLESALE_INVOICE_STATUSES.map((item) => item.id));

export function wholesaleInvoiceStatus(value: unknown, isSent = false): WholesaleInvoiceStatus {
  const text = String(value || '').trim();
  if (text === 'new' || text === 'confirmed') return 'registered';
  if (text === 'preparing') return 'packing';
  if (text === 'shipped') return 'sent';
  if (IDS.has(text)) return text as WholesaleInvoiceStatus;
  return isSent ? 'sent' : 'registered';
}

export function wholesaleInvoiceStatusLabel(value: unknown, isSent = false) {
  const id = wholesaleInvoiceStatus(value, isSent);
  return WHOLESALE_INVOICE_STATUSES.find((item) => item.id === id)?.label || 'ثبت شده';
}

export function invoiceLeavesWarehouse(status: WholesaleInvoiceStatus) {
  return status === 'sent' || status === 'delivered';
}
