import {
  getClothProfit,
  getInvoiceBalance,
  getInvoiceCart,
  getPersonAccount,
  getResource,
} from '@/actions/crud';
import { AccountingShell } from '@/components/accounting/AccountingShell';
import { RecordDetail, RecordMissing } from '@/components/accounting/RecordDetail';
import { errorMessage, guardSession } from '@/lib/auth-guard';
import { RECORD_LIST_TITLE, RECORD_TYPE_LABEL } from '@/lib/record-view';
import { getWorkspace } from '@/actions/workspace';
import { clothShareLabel } from '@/lib/cloth-share';

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
    } else if (resource === 'cloth') {
      const [profitRes, workspace] = await Promise.all([getClothProfit(id), getWorkspace()]);
      const data = workspace.data;
      rowRes.data.shareLabel = clothShareLabel(rowRes.data, data?.brands || [], data?.stores || []);
      if (profitRes.ok && profitRes.data) {
        const profit = profitRes.data as Record<string, unknown>;
        extras = {
          profit: {
            finishedUnit: Number(profit.finishedUnit || 0),
            avgSell: Number(profit.avgSell || 0),
            netQty: Number(profit.netQty || 0),
            soldQty: Number(profit.soldQty || 0),
            returnedQty: Number(profit.returnedQty || 0),
            revenue: Number(profit.revenue || 0),
            cogs: Number(profit.cogs || 0),
            totalProfit: Number(profit.totalProfit || 0),
            cashShare: Number(profit.cashShare || 0),
            checkShare: Number(profit.checkShare || 0),
            profitCash: Number(profit.profitCash || 0),
            profitCheck: Number(profit.profitCheck || 0),
            sellPrices: Array.isArray(profit.sellPrices)
              ? (profit.sellPrices as Array<{ price: number; count: number }>)
              : [],
            sales: Array.isArray(profit.sales)
              ? (profit.sales as Array<{
                  _id: string;
                  invoiceId?: string;
                  invoiceNumber?: string | number;
                  timeStamp?: string;
                  clientId?: string;
                  clientName?: string;
                  count: number;
                  price: number;
                  amount: number;
                  packs?: unknown;
                }>)
              : [],
          },
        };
      }
    }
  }

  return (
    <AccountingShell
      title={RECORD_TYPE_LABEL[resource] || 'جزئیات'}
      description={RECORD_LIST_TITLE[resource]}
      error={errorMessage(rowRes)}
    >
      {rowRes.ok && rowRes.data ? (
        <RecordDetail resource={resource} row={rowRes.data} extras={extras} />
      ) : (
        <RecordMissing resource={resource} message={rowRes.message} />
      )}
    </AccountingShell>
  );
}
