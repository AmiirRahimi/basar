import {
  WHOLESALE_INVOICE_STATUSES,
  wholesaleInvoiceStatus,
  wholesaleInvoiceStatusLabel,
  type WholesaleInvoiceStatus,
} from '@/lib/invoice-status';

export const WEBSITE_ORDER_STATUSES = WHOLESALE_INVOICE_STATUSES;

export type WebsiteOrderStatus = WholesaleInvoiceStatus | 'cancelled';

export function websiteOrderStatusLabel(status: string, isSent = false) {
  if (String(status || '').trim() === 'cancelled') return 'لغو شده';
  return wholesaleInvoiceStatusLabel(status, isSent);
}

export function normalizeWebsiteOrderStatus(value: unknown, isSent = false): WebsiteOrderStatus {
  if (String(value || '').trim() === 'cancelled') return 'cancelled';
  return wholesaleInvoiceStatus(value, isSent);
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
