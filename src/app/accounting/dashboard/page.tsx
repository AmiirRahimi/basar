import { AccountingShell } from '@/components/accounting/AccountingShell';
import { DashboardBoard } from '@/components/accounting/DashboardBoard';
import { getDashboardStats } from '@/actions/crud';
import { getPublicMarketPrices } from '@/actions/market-prices';
import { errorMessage, guardSession } from '@/lib/auth-guard';
import type { Check } from '@/lib/types';

export default async function DashboardPage() {
  const [res, marketPrices] = await Promise.all([getDashboardStats(), getPublicMarketPrices()]);
  guardSession(res);
  const data = (res.data || {}) as {
    sales?: {
      week?: { amount: number; count: number };
      month?: { amount: number; count: number };
      year?: { amount: number; count: number };
    };
    dueThisMonth?: Check[];
    returnedChecks?: Check[];
    debtors?: { _id: string; name: string; remaining: number }[];
    monthlySales?: { label: string; amount: number; count: number }[];
    partnerShares?: {
      rows?: {
        _id: string;
        name: string;
        sharePercent?: number;
        clothAmount?: number;
        shareAmount?: number;
        total?: number;
      }[];
      ownerShare?: number;
    };
  };

  return (
    <AccountingShell title="داشبورد" description="فروش، سررسید چک، برگشتی، نسیه و سهم شرکا" error={errorMessage(res)}>
      <DashboardBoard
        sales={data.sales || {}}
        monthlySales={data.monthlySales || []}
        dueThisMonth={data.dueThisMonth || []}
        returnedChecks={data.returnedChecks || []}
        debtors={data.debtors || []}
        partnerShares={data.partnerShares}
        marketPrices={marketPrices}
      />
    </AccountingShell>
  );
}
