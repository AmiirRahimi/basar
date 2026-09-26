'use client';

import { useMemo, useState } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { BadgePercent, Sparkles } from 'lucide-react';
import { faDate, faNumber, toman } from '@/lib/format';
import { Tabs } from '@/ui';
import { SearchableTable } from './SearchableTable';

export type UsageReport = {
  months: {
    label: string;
    bought: number;
    used: number;
    revenue: number;
    subscriptions: number;
    subscriptionRevenue: number;
  }[];
  subscriptions: {
    _id: string;
    fullName: string;
    phonenumber: string;
    planName: string;
    billingCycle: string;
    price: number;
    startDate: string;
    endDate: string;
    active: boolean;
    remainingDays: number;
  }[];
  purchases: {
    _id: string;
    fullName: string;
    phonenumber: string;
    packName: string;
    tokens: number;
    price: number;
    timeStamp: string;
  }[];
  people: {
    _id: string;
    fullName: string;
    phonenumber: string;
    bought: number;
    used: number;
    balance: number;
    purchaseCount: number;
    spent: number;
    lastAt: string;
  }[];
  stats: {
    activeSubscriptions: number;
    expiringSoon: number;
    subscriptionsThisMonth: number;
    subscriptionRevenueThisMonth: number;
    subscriptionRevenueLastMonth: number;
    subscriptionRevenueTotal: number;
    tokensBought: number;
    tokensUsed: number;
    tokensRemaining: number;
    tokensBoughtThisMonth: number;
    tokensUsedThisMonth: number;
    tokenRevenue: number;
    tokenRevenueThisMonth: number;
    buyers: number;
  };
};

const cycleLabel = (value?: string) => (value === 'year' ? 'سالانه' : value === 'month' ? 'ماهانه' : value || '—');

export function AdminUsageBoard({ report }: { report: UsageReport }) {
  const [tab, setTab] = useState<'subscriptions' | 'tokens'>('subscriptions');

  return (
    <div className="space-y-4" dir="rtl">
      <Tabs
        value={tab}
        onChange={(next) => setTab(next as 'subscriptions' | 'tokens')}
        tabs={[
          { value: 'subscriptions', label: 'اشتراک‌ها', icon: <BadgePercent className="h-4 w-4" /> },
          { value: 'tokens', label: 'توکن تصویر', icon: <Sparkles className="h-4 w-4" /> },
        ]}
      />

      {tab === 'subscriptions' ? <SubscriptionsView report={report} /> : <TokensView report={report} />}
    </div>
  );
}


function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-gray-900">{value}</p>
      {hint ? <p className="mt-1 text-[11px] text-gray-400">{hint}</p> : null}
    </div>
  );
}

function MonthChart({
  title,
  months,
  valueOf,
  format,
}: {
  title: string;
  months: UsageReport['months'];
  valueOf: (row: UsageReport['months'][number]) => number;
  format: (value: number) => string;
}) {
  const max = Math.max(...months.map(valueOf), 1);
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-gray-900">{title}</h3>
      <div className="flex h-36 items-end gap-1.5">
        {months.map((row) => {
          const value = valueOf(row);
          const height = Math.max((value / max) * 100, value ? 8 : 0);
          return (
            <div key={row.label} className="flex min-w-0 flex-1 flex-col items-center gap-1" title={`${row.label}: ${format(value)}`}>
              <div className="flex h-28 w-full items-end rounded-md bg-gray-50">
                <span className="w-full rounded-t-md bg-teal-500" style={{ height: `${height}%` }} />
              </div>
              <span className="text-[10px] text-gray-500">{row.label.slice(0, 3)}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function SubscriptionsView({ report }: { report: UsageReport }) {
  const helper = createColumnHelper<UsageReport['subscriptions'][number]>();
  const columns = useMemo(
    () => [
      helper.accessor('fullName', { header: 'کاربر', cell: (info) => info.getValue() || '—' }),
      helper.accessor('phonenumber', { header: 'موبایل', cell: (info) => <span dir="ltr">{info.getValue() || '—'}</span> }),
      helper.accessor('planName', { header: 'طرح', cell: (info) => info.getValue() || '—' }),
      helper.accessor('billingCycle', { header: 'دوره', cell: (info) => cycleLabel(info.getValue()) }),
      helper.accessor('price', { header: 'مبلغ', cell: (info) => toman(info.getValue()) }),
      helper.accessor('startDate', { header: 'شروع', cell: (info) => faDate(info.getValue()) }),
      helper.accessor('endDate', { header: 'پایان', cell: (info) => faDate(info.getValue()) }),
      helper.accessor('remainingDays', {
        header: 'مانده',
        cell: (info) => (info.row.original.active ? `${faNumber(info.getValue())} روز` : '—'),
      }),
      helper.accessor('active', { header: 'وضعیت', cell: (info) => (info.getValue() ? 'فعال' : 'تمام‌شده') }),
    ],
    [helper],
  );

  const stats = report.stats;
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="اشتراک فعال" value={faNumber(stats.activeSubscriptions)} />
        <Stat label="نزدیک به پایان" value={faNumber(stats.expiringSoon)} hint="۱۴ روز یا کمتر" />
        <Stat
          label="خرید این ماه"
          value={faNumber(stats.subscriptionsThisMonth)}
          hint={toman(stats.subscriptionRevenueThisMonth)}
        />
        <Stat
          label="کل درآمد اشتراک"
          value={toman(stats.subscriptionRevenueTotal)}
          hint={`ماه قبل ${toman(stats.subscriptionRevenueLastMonth)}`}
        />
      </div>
      <MonthChart
        title="درآمد اشتراک در ماه‌های امسال"
        months={report.months}
        valueOf={(row) => row.subscriptionRevenue}
        format={toman}
      />
      <SearchableTable
        storageKey="admin-usage-subscriptions"
        data={report.subscriptions}
        columns={columns}
        getRowId={(row) => row._id}
        extraSearch={(row) => [row.fullName, row.phonenumber, row.planName, row.active ? 'فعال' : 'تمام'].join(' ')}
        emptyMessage="اشتراکی ثبت نشده"
      />
    </div>
  );
}

function TokensView({ report }: { report: UsageReport }) {
  const peopleHelper = createColumnHelper<UsageReport['people'][number]>();
  const buyHelper = createColumnHelper<UsageReport['purchases'][number]>();
  const peopleColumns = useMemo(
    () => [
      peopleHelper.accessor('fullName', { header: 'کاربر', cell: (info) => info.getValue() || '—' }),
      peopleHelper.accessor('phonenumber', { header: 'موبایل', cell: (info) => <span dir="ltr">{info.getValue() || '—'}</span> }),
      peopleHelper.accessor('bought', { header: 'خریداری‌شده', cell: (info) => faNumber(info.getValue()) }),
      peopleHelper.accessor('used', { header: 'مصرف‌شده', cell: (info) => faNumber(info.getValue()) }),
      peopleHelper.accessor('balance', { header: 'مانده', cell: (info) => faNumber(info.getValue()) }),
      peopleHelper.accessor('purchaseCount', { header: 'تعداد خرید', cell: (info) => faNumber(info.getValue()) }),
      peopleHelper.accessor('spent', { header: 'مبلغ', cell: (info) => toman(info.getValue()) }),
      peopleHelper.accessor('lastAt', { header: 'آخرین خرید', cell: (info) => (info.getValue() ? faDate(info.getValue()) : '—') }),
    ],
    [peopleHelper],
  );
  const purchaseColumns = useMemo(
    () => [
      buyHelper.accessor('fullName', { header: 'کاربر', cell: (info) => info.getValue() || '—' }),
      buyHelper.accessor('phonenumber', { header: 'موبایل', cell: (info) => <span dir="ltr">{info.getValue() || '—'}</span> }),
      buyHelper.accessor('packName', { header: 'بسته' }),
      buyHelper.accessor('tokens', { header: 'توکن', cell: (info) => faNumber(info.getValue()) }),
      buyHelper.accessor('price', { header: 'مبلغ', cell: (info) => toman(info.getValue()) }),
      buyHelper.accessor('timeStamp', { header: 'تاریخ', cell: (info) => faDate(info.getValue()) }),
    ],
    [buyHelper],
  );

  const stats = report.stats;
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="کل توکن خریداری‌شده" value={faNumber(stats.tokensBought)} hint={`${faNumber(stats.buyers)} خریدار`} />
        <Stat label="کل توکن مصرف‌شده" value={faNumber(stats.tokensUsed)} hint={`این ماه ${faNumber(stats.tokensUsedThisMonth)}`} />
        <Stat label="مانده روی حساب‌ها" value={faNumber(stats.tokensRemaining)} />
        <Stat
          label="خرید این ماه"
          value={faNumber(stats.tokensBoughtThisMonth)}
          hint={toman(stats.tokenRevenueThisMonth)}
        />
        <Stat label="درآمد توکن" value={toman(stats.tokenRevenue)} />
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <MonthChart title="توکن خریداری‌شده در ماه‌های امسال" months={report.months} valueOf={(row) => row.bought} format={faNumber} />
        <MonthChart title="توکن مصرف‌شده در ماه‌های امسال" months={report.months} valueOf={(row) => row.used} format={faNumber} />
      </div>
      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-900">هر کاربر</h3>
        <SearchableTable
          storageKey="admin-usage-people"
          data={report.people}
          columns={peopleColumns}
          getRowId={(row) => row._id}
          extraSearch={(row) => [row.fullName, row.phonenumber].join(' ')}
          emptyMessage="هنوز توکنی خرید یا مصرف نشده"
        />
      </section>
      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-900">خریدهای توکن</h3>
        <SearchableTable
          storageKey="admin-usage-purchases"
          data={report.purchases}
          columns={purchaseColumns}
          getRowId={(row) => row._id}
          extraSearch={(row) => [row.fullName, row.phonenumber, row.packName].join(' ')}
          emptyMessage="خرید توکنی ثبت نشده"
        />
      </section>
    </div>
  );
}
