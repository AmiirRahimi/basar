import Link from 'next/link';
import { getPersonAccount } from '@/actions/crud';
import { PersonPaymentsPrintView } from '@/components/counting/PersonPaymentsPrintView';
import { guardSession } from '@/lib/auth-guard';
import type { AccountInvoice, AccountPayment } from '@/lib/payment-display';

export default async function PersonPaymentsPrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ personId: string }>;
  searchParams: Promise<{ scope?: string; ids?: string }>;
}) {
  const { personId } = await params;
  const { scope: rawScope, ids } = await searchParams;
  const scope =
    rawScope === 'payments' || rawScope === 'invoices' || rawScope === 'all' ? rawScope : 'all';
  const invoiceIds = ids
    ? ids
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean)
    : [];

  const res = await getPersonAccount(personId);
  guardSession(res);
  const account = res.ok && res.data ? (res.data as Record<string, unknown>) : null;

  if (!account) {
    return (
      <div className="mx-auto max-w-lg p-8 text-center" dir="rtl">
        <p className="mb-4">{res.message || 'شخص پیدا نشد'}</p>
        <Link href="/counting/account" className="text-primary">
          بازگشت به حساب
        </Link>
      </div>
    );
  }

  return (
    <PersonPaymentsPrintView
      personId={personId}
      scope={scope === 'invoices' && !invoiceIds.length ? 'all' : scope}
      invoiceIds={invoiceIds}
      account={{
        kind: typeof account.kind === 'string' ? account.kind : undefined,
        person: account.person,
        remaining: Number(account.remaining || 0),
        paidTotal: Number(account.paidTotal || 0),
        returnTotal: Number(account.returnTotal || 0),
        creditToCustomer: Number(account.creditToCustomer || 0),
        invoices: Array.isArray(account.invoices) ? (account.invoices as AccountInvoice[]) : [],
        payments: Array.isArray(account.payments) ? (account.payments as AccountPayment[]) : [],
      }}
    />
  );
}
