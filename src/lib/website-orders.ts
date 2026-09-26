export const WEBSITE_ORDER_STATUSES = [
  { id: 'new', label: 'ثبت شده' },
  { id: 'confirmed', label: 'تایید شده' },
  { id: 'preparing', label: 'آماده‌سازی' },
  { id: 'shipped', label: 'ارسال شده' },
  { id: 'delivered', label: 'تحویل شده' },
  { id: 'cancelled', label: 'لغو شده' },
] as const;

export type WebsiteOrderStatus = (typeof WEBSITE_ORDER_STATUSES)[number]['id'];

export function websiteOrderStatusLabel(status: string) {
  return WEBSITE_ORDER_STATUSES.find((item) => item.id === status)?.label || 'ثبت شده';
}

export function normalizeWebsiteOrderStatus(value: unknown, isSent = false): WebsiteOrderStatus {
  const text = String(value || '').trim();
  if (WEBSITE_ORDER_STATUSES.some((item) => item.id === text)) return text as WebsiteOrderStatus;
  return isSent ? 'shipped' : 'new';
}

export type WebsiteOrderLine = {
  name: string;
  packsLabel: string;
  count: number;
  total: number;
};

export type WebsiteOrderRow = {
  id: string;
  invoiceNumber: number;
  date: string;
  status: WebsiteOrderStatus;
  statusLabel: string;
  total: number;
  paidAmount: number;
  customerName: string;
  customerPhone: string;
  address: string;
  storeName: string;
  brandName: string;
  channel: string;
  lines: WebsiteOrderLine[];
};

export type WebsiteBuyerRow = {
  phone: string;
  name: string;
  orders: number;
  total: number;
  lastOrder: string;
};

export type WebsitePaymentRow = {
  id: string;
  date: string;
  invoiceNumber: number;
  customerName: string;
  customerPhone: string;
  amount: number;
  kind: string;
  description: string;
};

export type WebsiteOrderBoard = {
  stats: {
    total: number;
    orders: number;
    thisMonth: number;
    unpaid: number;
    buyers: number;
    cancelled: number;
  };
  statusCounts: { id: WebsiteOrderStatus; label: string; count: number }[];
  buyers: WebsiteBuyerRow[];
  orders: WebsiteOrderRow[];
  payments: WebsitePaymentRow[];
};
