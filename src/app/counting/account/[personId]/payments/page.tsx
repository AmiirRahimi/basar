import { CountingShell } from '@/components/counting/CountingShell';
import { PersonPaymentsView } from '@/components/counting/PersonPaymentsView';
import { getPersonAccount } from '@/actions/crud';
import { errorMessage, guardSession } from '@/lib/auth-guard';
import { displayName } from '@/lib/format';
import type { AccountInvoice, AccountPayment } from '@/lib/payment-display';

export default async function PersonPaymentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ personId: string }>;
  searchParams: Promise<{ invoice?: string }>;
}) {
  const { personId } = await params;
  const { invoice } = await searchParams;
  const res = await getPersonAccount(personId);
  guardSession(res);
  const account = res.ok && res.data ? (res.data as Record<string, unknown>) : null;
  return (
    <CountingShell
      title={account ? `پرداخت‌های ${displayName(account.person)}` : 'پرداخت‌ها'}
      description="پرداخت هر فاکتور ممکن است چند نقد و چند چک داشته باشد"
      error={errorMessage(res)}
    >
      {account ? (
        <PersonPaymentsView
          personId={personId}
          invoiceId={invoice}
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
      ) : (
        <p className="text-sm text-gray-500">شخص پیدا نشد.</p>
      )}
    </CountingShell>
  );
}


