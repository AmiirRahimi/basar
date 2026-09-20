import { getInvoiceBalance, getInvoiceCart, getPersonAccount, getResource } from '@/actions/crud';
import { CountingShell } from '@/components/counting/CountingShell';
import { RecordDetail, RecordMissing } from '@/components/counting/RecordDetail';
import { errorMessage, guardSession } from '@/lib/auth-guard';
import { RECORD_LIST_TITLE, RECORD_TYPE_LABEL } from '@/lib/record-view';
import type { AccountPayment } from '@/lib/payment-display';

export async function RecordDetailPage({ resource, id }: { resource: string; id: string }) {
  const rowRes = await getResource<Record<string, any>>(resource, id);
  guardSession(rowRes);

  let extras: Parameters<typeof RecordDetail>[0]['extras'];
  if (rowRes.ok && rowRes.data) {
    if (resource === 'invoice') {
      const [cartRes, balanceRes] = await Promise.all([getInvoiceCart(id), getInvoiceBalance(id)]);
      const balance = balanceRes.ok && balanceRes.data ? (balanceRes.data as Record<string, unknown>) : null;
      extras = {
        lines: Array.isArray(cartRes.data) ? cartRes.data : [],
        balance: balance
          ? {
              total: Number(balance.total || 0),
              paid: Number(balance.paid || 0),
              returnTotal: Number(balance.returnTotal || 0),
              remaining: Number(balance.remaining || 0),
            }
          : undefined,
        payments: Array.isArray(balance?.payments) ? (balance.payments as AccountPayment[]) : [],
      };
    } else if (resource === 'person') {
      const accountRes = await getPersonAccount(id);
      if (accountRes.ok && accountRes.data) {
        const account = accountRes.data as Record<string, number | string>;
        extras = {
          account: {
            kind: typeof account.kind === 'string' ? account.kind : undefined,
            remaining: Number(account.remaining || 0),
            paidTotal: Number(account.paidTotal || 0),
            purchaseTotal: Number(account.purchaseTotal || account.owedTotal || 0),
            creditToCustomer: Number(account.creditToCustomer || 0),
            returnTotal: Number(account.returnTotal || 0),
          },
        };
      }
    }
  }

  return (
    <CountingShell
      title={RECORD_TYPE_LABEL[resource] || 'جزئیات'}
      description={RECORD_LIST_TITLE[resource]}
      error={errorMessage(rowRes)}
    >
      {rowRes.ok && rowRes.data ? (
        <RecordDetail resource={resource} row={rowRes.data} extras={extras} />
      ) : (
        <RecordMissing resource={resource} message={rowRes.message} />
      )}
    </CountingShell>
  );
}
