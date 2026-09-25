import type { ReactNode } from 'react';
import Link from 'next/link';
import { AlertTriangle, Banknote, CalendarClock, FileWarning, Handshake, TrendingUp, Wallet } from 'lucide-react';
import { DashboardCharts } from './DashboardCharts';
import { CHECK_DIRECTIONS, CHECK_STATUSES, checkStatus, persianMonthLabel } from '@/lib/checks';
import { displayName, faNumber, toman } from '@/lib/format';
import type { Check } from '@/lib/types';
import { Price } from './Price';
import { TeamInviteInbox } from './TeamInviteInbox';

type SalesPeriod = { amount?: number; count?: number };

type Debtor = { _id: string; name: string; remaining: number };

type PartnerShare = {
  rows?: {
    _id: string;
    name: string;
    sharePercent?: number;
    clothAmount?: number;
    shareAmount?: number;
    total?: number;
  }[];
  ownerShare?: number;
  assigned?: number;
  pool?: number;
  total?: number;
};

export function DashboardBoard({
  sales,
  monthlySales = [],
  dueThisMonth,
  returnedChecks,
  debtors,
  partnerShares,
}: {
  sales: { week?: SalesPeriod; month?: SalesPeriod; year?: SalesPeriod };
  monthlySales?: { label: string; amount?: number; count?: number }[];
  dueThisMonth: Check[];
  returnedChecks: Check[];
  debtors: Debtor[];
  partnerShares?: PartnerShare;
}) {
  const dueTotal = sumAmount(dueThisMonth);
  const returnedTotal = sumAmount(returnedChecks);
  const debtTotal = debtors.reduce((sum, row) => sum + Number(row.remaining || 0), 0);
  const monthLabel = persianMonthLabel();

  return (
    <div className="space-y-6">
      <TeamInviteInbox />
      <section>
        <h2 className="mb-3 text-sm font-semibold text-gray-700">فروش</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            title="این هفته"
            amount={sales.week?.amount}
            hint={`${faNumber(sales.week?.count)} فاکتور`}
            icon={TrendingUp}
            tone="teal"
          />
          <StatCard
            title="این ماه"
            amount={sales.month?.amount}
            hint={`${faNumber(sales.month?.count)} فاکتور`}
            icon={Banknote}
            tone="sky"
          />
          <StatCard
            title="امسال"
            amount={sales.year?.amount}
            hint={`${faNumber(sales.year?.count)} فاکتور`}
            icon={Wallet}
            tone="violet"
          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-gray-700">چک و نسیه</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            title={`سررسید ${monthLabel}`}
            amount={dueTotal}
            hint={`${faNumber(dueThisMonth.length)} چک در جریان`}
            icon={CalendarClock}
            tone="amber"
          />
          <StatCard
            title="چک‌های برگشتی"
            amount={returnedTotal}
            hint={`${faNumber(returnedChecks.length)} فقره`}
            icon={FileWarning}
            tone="rose"
          />
          <StatCard
            title="مانده نسیه دفتر"
            amount={debtTotal}
            hint={`${faNumber(debtors.length)} مشتری`}
            icon={AlertTriangle}
            tone="orange"
          />
        </div>
      </section>

      {partnerShares?.rows?.length ? (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-gray-700">سهم شرکا از فروش امسال</h2>
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <ul className="divide-y divide-gray-100">
              {partnerShares.rows.map((row) => (
                <li key={row._id} className="flex items-start justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{row.name}</p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {faNumber(row.sharePercent)}٪ از فروش آزاد
                      {row.clothAmount ? ` + ${toman(row.clothAmount)} لباس اختصاصی` : ''}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-medium">{toman(row.total)}</span>
                </li>
              ))}
              <li className="flex items-start justify-between gap-3 bg-gray-50 px-4 py-3">
                <p className="flex items-center gap-2 font-medium">
                  <Handshake className="h-4 w-4 text-teal-700" />
                  صاحب فروشگاه
                </p>
                <span className="shrink-0 text-sm font-medium">{toman(partnerShares.ownerShare)}</span>
              </li>
            </ul>
          </div>
        </section>
      ) : null}

      <DashboardCharts
        sales={sales}
        monthlySales={monthlySales}
        dueTotal={dueTotal}
        returnedTotal={returnedTotal}
        debtTotal={debtTotal}
        debtors={debtors}
      />

      <section className="grid gap-4 lg:grid-cols-3">
        <ListCard
          title="چک‌های سررسید این ماه"
          href="/counting/checks"
          action="همه چک‌ها"
          empty="چک سررسید این ماه نیست"
          count={dueThisMonth.length}
        >
          {dueThisMonth.map((row) => (
            <li key={row._id} className="flex items-start justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate font-medium">{displayName(row._owner)}</p>
                <p className="mt-0.5 text-xs text-gray-500">
                  {CHECK_DIRECTIONS[row.direction === 'out' ? 'out' : 'in']} — {row.dueDate || '—'}
                </p>
              </div>
              <span className="shrink-0 text-sm font-medium">{toman(row.amount)}</span>
            </li>
          ))}
        </ListCard>
        <ListCard
          title="چک‌های برگشتی"
          href="/counting/checks"
          action="ثبت وضعیت"
          empty="چک برگشتی نیست"
          count={returnedChecks.length}
        >
          {returnedChecks.map((row) => (
            <li key={row._id} className="flex items-start justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate font-medium">{displayName(row._owner)}</p>
                <p className="mt-0.5 text-xs text-rose-600">
                  {CHECK_STATUSES[checkStatus(row)]} — {row.dueDate || '—'}
                </p>
              </div>
              <span className="shrink-0 text-sm font-medium">{toman(row.amount)}</span>
            </li>
          ))}
        </ListCard>
        <ListCard
          title="نسیه دفتر"
          href="/counting/account"
          action="ثبت پرداخت"
          empty="مانده نسیه‌ای نیست"
          count={debtors.length}
        >
          {debtors.map((row) => (
            <li key={row._id} className="flex items-start justify-between gap-3 px-4 py-3">
              <p className="truncate font-medium">{row.name}</p>
              <span className="shrink-0 text-sm font-medium">{toman(row.remaining)}</span>
            </li>
          ))}
        </ListCard>
      </section>
    </div>
  );
}

function sumAmount(rows: { amount?: number }[]) {
  return rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
}

const TONES = {
  teal: 'border-teal-200 bg-teal-50/70 text-teal-800',
  sky: 'border-sky-200 bg-sky-50/70 text-sky-800',
  violet: 'border-violet-200 bg-violet-50/70 text-violet-800',
  amber: 'border-amber-200 bg-amber-50/70 text-amber-800',
  rose: 'border-rose-200 bg-rose-50/70 text-rose-800',
  orange: 'border-orange-200 bg-orange-50/70 text-orange-800',
} as const;

function StatCard({
  title,
  amount,
  hint,
  icon: Icon,
  tone,
}: {
  title: string;
  amount?: number;
  hint: string;
  icon: typeof TrendingUp;
  tone: keyof typeof TONES;
}) {
  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${TONES[tone]}`}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">{title}</p>
        <Icon className="h-5 w-5 opacity-80" />
      </div>
      <p className="text-2xl font-semibold tracking-tight text-gray-900">
        <Price value={amount} />
      </p>
      <p className="mt-1 text-sm opacity-80">{hint}</p>
    </div>
  );
}

function ListCard({
  title,
  href,
  action,
  empty,
  count,
  children,
}: {
  title: string;
  href: string;
  action: string;
  empty: string;
  count: number;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        <Link href={href} className="text-xs font-medium text-teal-700 hover:underline">
          {action}
        </Link>
      </div>
      {count > 0 ? (
        <ul className="divide-y divide-gray-100">{children}</ul>
      ) : (
        <p className="px-4 py-8 text-center text-sm text-gray-500">{empty}</p>
      )}
    </div>
  );
}
