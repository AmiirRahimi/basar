export type AccountingAddressOffer = {
  id: string;
  label: string;
  address: string;
  city: string;
  landlines: string[];
};

export type ShopOrderLine = {
  name: string;
  packsLabel: string;
  count: number;
  total: number;
};

export type ShopOrder = {
  id: string;
  invoiceNumber: number;
  date: string;
  total: number;
  sent: boolean;
  paid: boolean;
  status: string;
  statusLabel: string;
  lines: ShopOrderLine[];
};

export type ShopViewer = {
  fullName: string;
  phonenumber: string;
  shopAddress: string;
  shopCity: string;
  postalCode: string;
};

export type ShopAccountView = ShopViewer & {
  email: string;
  landlines: string[];
  viaAccounting: boolean;
  accountingAddresses: AccountingAddressOffer[];
  orders: ShopOrder[];
};

export function shopReturnPath(value: unknown) {
  const text = String(value || '').trim();
  if (!text.startsWith('/') || text.startsWith('//') || text.includes('\\') || text.includes('://')) return '';
  if (text.startsWith('/accounting') || text.startsWith('/admin') || text.startsWith('/login')) return '';
  return text.slice(0, 200);
}
