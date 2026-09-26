import { displayName } from '@/lib/format';
import { checkSerialLabel, paymentApplied } from '@/lib/checks';

export type PaymentCheck = {
  _id?: string;
  series?: string | number;
  serialNumber?: number | string;
  dueDate?: string;
  amount?: number;
};

export type AccountPayment = {
  _id: string;
  timeStamp?: string;
  cash?: number;
  cashAmount?: number;
  checkAmount?: number;
  discount?: number;
  creditAmount?: number;
  description?: string;
  _invoice?: { _id?: string; invoiceNumber?: string | number } | string;
  _check?: PaymentCheck | string;
  checks?: PaymentCheck[];
};

export type AccountInvoice = {
  _id: string;
  invoiceNumber?: string | number;
  timeStamp?: string;
  total: number;
  paid: number;
  returnTotal?: number;
  remaining: number;
  paymentCount?: number;
  cashCount?: number;
  checkCount?: number;
};

export type PaymentPartTile = {
  key: string;
  label: string;
  amount: number;
  note?: string;
  className: string;
};

export function invoiceKey(value: unknown) {
  if (!value) return '';
  if (typeof value === 'object' && value && '_id' in value) return String((value as { _id: unknown })._id);
  return String(value);
}

export function paymentTarget(row: Pick<AccountPayment, '_invoice'>, payable: boolean) {
  if (row._invoice) {
    const number =
      typeof row._invoice === 'object' ? row._invoice.invoiceNumber || displayName(row._invoice) : displayName(row._invoice);
    return `فاکتور ${number}`;
  }
  return payable ? 'مانده بدهی این شخص' : 'مانده کل فاکتورها';
}

export function checkNote(check?: PaymentCheck | string | null) {
  if (!check || typeof check !== 'object') return '';
  const serial = checkSerialLabel(check);
  return [serial ? `شماره ${serial}` : '', check.dueDate ? `سررسید ${check.dueDate}` : '']
    .filter(Boolean)
    .join(' · ');
}

export function paymentChecks(row: AccountPayment): PaymentCheck[] {
  if (Array.isArray(row.checks) && row.checks.length) return row.checks.filter(Boolean);
  if (row._check && typeof row._check === 'object') return [row._check];
  return [];
}

export function paymentPartTiles(row: AccountPayment): PaymentPartTile[] {
  const cash = Number(row.cashAmount ?? row.cash ?? 0);
  const checks = paymentChecks(row);
  const tiles: PaymentPartTile[] = [];
  if (cash > 0) {
    tiles.push({ key: 'cash', label: 'نقد', amount: cash, className: 'bg-emerald-50 text-emerald-900' });
  }
  if (checks.length) {
    checks.forEach((check, index) => {
      tiles.push({
        key: `check-${check._id || index}`,
        label: checks.length > 1 ? `چک ${index + 1}` : 'چک',
        // When one check is split across invoice payments, prefer this row's share.
        amount:
          checks.length === 1
            ? Number(row.checkAmount || check.amount || 0)
            : Number(check.amount || 0) || Number(row.checkAmount || 0),
        note: checkNote(check),
        className: 'bg-sky-50 text-sky-900',
      });
    });
  } else if (Number(row.checkAmount || 0) > 0) {
    tiles.push({
      key: 'check',
      label: 'چک',
      amount: Number(row.checkAmount || 0),
      note: checkNote(typeof row._check === 'object' ? row._check : null),
      className: 'bg-sky-50 text-sky-900',
    });
  }
  const discount = Number(row.discount || 0);
  if (discount > 0) {
    tiles.push({ key: 'discount', label: 'تخفیف', amount: discount, className: 'bg-amber-50 text-amber-950' });
  }
  const credit = Number(row.creditAmount || 0);
  if (credit > 0) {
    tiles.push({ key: 'credit', label: 'نسیه دفتر', amount: credit, className: 'bg-gray-100 text-gray-700' });
  }
  return tiles;
}

export function paymentMethodCounts(payments: AccountPayment[]) {
  let cashCount = 0;
  let checkCount = 0;
  for (const row of payments) {
    if (Number(row.cashAmount ?? row.cash ?? 0) > 0) cashCount += 1;
    const checks = paymentChecks(row);
    if (checks.length) checkCount += checks.length;
    else if (Number(row.checkAmount || 0) > 0) checkCount += 1;
  }
  return {
    paymentCount: payments.length,
    cashCount,
    checkCount,
    paidTotal: payments.reduce((sum, row) => sum + paymentApplied(row), 0),
  };
}

export function personPaymentsHref(personId: string, invoiceId?: string) {
  const base = `/accounting/account/${personId}/payments`;
  return invoiceId ? `${base}?invoice=${invoiceId}` : base;
}
