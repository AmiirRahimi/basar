import {
  type AccountInvoice,
  type AccountPayment,
  invoiceKey,
  paymentMethodCounts,
} from '@/lib/payment-display';

export type PersonPaymentGroup = {
  invoice: AccountInvoice;
  payments: AccountPayment[];
};

export function sortAccountPayments(rows: AccountPayment[]) {
  return [...rows].sort(
    (a, b) => new Date(b.timeStamp || 0).getTime() - new Date(a.timeStamp || 0).getTime(),
  );
}

export function buildPersonPaymentGroups(
  invoices: AccountInvoice[],
  payments: AccountPayment[],
): { groups: PersonPaymentGroup[]; unassigned: AccountPayment[] } {
  const sorted = sortAccountPayments(payments);
  const byInvoice = new Map<string, AccountPayment[]>();
  const unassigned: AccountPayment[] = [];
  for (const row of sorted) {
    const id = invoiceKey(row._invoice);
    if (!id) {
      unassigned.push(row);
      continue;
    }
    const list = byInvoice.get(id) || [];
    list.push(row);
    byInvoice.set(id, list);
  }
  const known = new Set(invoices.map((row) => String(row._id)));
  const extraInvoices: AccountInvoice[] = [...byInvoice.entries()]
    .filter(([id]) => !known.has(id))
    .map(([id, rows]) => {
      const sample = rows[0]?._invoice;
      const invoiceNumber = sample && typeof sample === 'object' ? sample.invoiceNumber : undefined;
      const paid = paymentMethodCounts(rows).paidTotal;
      return {
        _id: id,
        invoiceNumber,
        total: paid,
        paid,
        remaining: 0,
        ...paymentMethodCounts(rows),
      };
    });
  const groups = [...invoices, ...extraInvoices]
    .sort((a, b) => {
      const aOpen = Number(a.remaining || 0) > 0 ? 1 : 0;
      const bOpen = Number(b.remaining || 0) > 0 ? 1 : 0;
      if (aOpen !== bOpen) return bOpen - aOpen;
      return new Date(b.timeStamp || 0).getTime() - new Date(a.timeStamp || 0).getTime();
    })
    .map((invoice) => ({
      invoice,
      payments: byInvoice.get(String(invoice._id)) || [],
    }));
  return { groups, unassigned };
}

export function personPaymentsPrintHref(
  personId: string,
  options: { scope: 'all' | 'payments' | 'invoices'; ids?: string[] },
) {
  const params = new URLSearchParams();
  params.set('scope', options.scope);
  if (options.ids?.length) params.set('ids', options.ids.join(','));
  return `/counting/account/${personId}/payments/print?${params.toString()}`;
}
