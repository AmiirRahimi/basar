'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { createColumnHelper } from '@tanstack/react-table';
import { BadgePercent, Sparkles, Users } from 'lucide-react';
import type { AdminOverview } from '@/components/counting/AdminPanel';
import type { UsageReport } from '@/components/counting/AdminUsageBoard';
import { SearchableTable } from '@/components/counting/SearchableTable';
import { cycleLabel } from '@/lib/plans';
import { faDate, faNumber, toman } from '@/lib/format';

type DashboardUser = AdminOverview['users'][number] & {
  tokensBought: number;
  tokensUsed: number;
  tokensBalance: number;
};

export function AdminDashboard({
  overview,
  usage,
}: {
  overview: AdminOverview;
  usage: UsageReport;
}) {
  const tokenByUser = useMemo(() => {
    const map = new Map<string, UsageReport['people'][number]>();
    for (const row of usage.people) map.set(row._id, row);
    return map;
  }, [usage.people]);

  const users = useMemo<DashboardUser[]>(
    () =>
      overview.users.map((user) => {
        const tokens = tokenByUser.get(user._id);
        return {
          ...user,
          tokensBought: tokens?.bought || 0,
          tokensUsed: tokens?.used || 0,
          tokensBalance: tokens?.balance ?? Number(user.imageTokens || 0),
        };
      }),
    [overview.users, tokenByUser],
  );

  const helper = createColumnHelper<DashboardUser>();
  const columns = useMemo(
    () => [
      helper.accessor('fullName', { header: 'کاربر', cell: (info) => info.getValue() || '—' }),
      helper.accessor('phonenumber', {
        header: 'موبایل',
        cell: (info) => <span dir="ltr">{info.getValue() || '—'}</span>,
      }),
      helper.accessor((row) => (row.active ? row.planName || 'فعال' : 'ندارد'), {
        id: 'subscription',
        header: 'اشتراک',
      }),
      helper.accessor('remainingDays', {
        header: 'مانده اشتراک',
        cell: ({ row }) => (row.original.active ? `${faNumber(row.original.remainingDays)} روز` : '—'),
      }),
      helper.accessor('tokensBought', {
        header: 'توکن خریده‌شده',
        cell: (info) => faNumber(info.getValue()),
      }),
      helper.accessor('tokensUsed', {
        header: 'توکن مصرف‌شده',
        cell: (info) => faNumber(info.getValue()),
      }),
      helper.accessor('tokensBalance', {
        header: 'مانده توکن',
        cell: (info) => faNumber(info.getValue()),
      }),
    ],
    [helper],
  );

  return (
    <div className="space-y-4" dir="rtl">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={Users} label="کاربران" value={faNumber(overview.stats.users)} hint={`${faNumber(overview.stats.loggedIn)} وارد شده`} />
        <Stat
          icon={BadgePercent}
          label="اشتراک فعال"
          value={faNumber(usage.stats.activeSubscriptions)}
          hint={`${faNumber(usage.stats.expiringSoon)} نزدیک به پایان`}
        />
        <Stat
          icon={Sparkles}
          label="توکن خریداری‌شده"
          value={faNumber(usage.stats.tokensBought)}
          hint={`${faNumber(usage.stats.buyers)} خریدار`}
        />
        <Stat
          icon={Sparkles}
          label="مانده توکن تصویر"
          value={faNumber(usage.stats.tokensRemaining)}
          hint={`مصرف‌شده ${faNumber(usage.stats.tokensUsed)}`}
        />
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        <Link href="/admin/users" className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-gray-700 hover:bg-gray-50">
          مدیریت کاربران و کد تخفیف
        </Link>
        <Link href="/admin/usage" className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-gray-700 hover:bg-gray-50">
          جزئیات اشتراک و توکن
        </Link>
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-gray-900">کاربران، اشتراک و توکن تصویر</h2>
        <SearchableTable
          storageKey="admin-dashboard-users"
          data={users}
          columns={columns}
          getRowId={(row) => String(row._id)}
          extraSearch={(row) =>
            [
              row.planName,
              row.active ? 'فعال' : 'ندارد',
              faNumber(row.tokensBought),
              faNumber(row.tokensBalance),
            ].join(' ')
          }
          emptyMessage="کاربری ثبت نشده"
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <MiniList
          title="خریدهای اخیر اشتراک"
          href="/admin/users"
          empty="خرید اشتراکی نیست"
          rows={overview.purchases.slice(0, 6).map((row) => ({
            id: row._id,
            title: row.fullName || row.phonenumber || 'کاربر',
            meta: `${row.planName || 'طرح'} · ${cycleLabel(row.billingCycle)} · ${toman(row.price)}`,
            date: faDate(row.startDate),
          }))}
        />
        <MiniList
          title="خریدهای اخیر توکن تصویر"
          href="/admin/usage"
          empty="خرید توکنی نیست"
          rows={usage.purchases.slice(0, 6).map((row) => ({
            id: row._id,
            title: row.fullName || row.phonenumber || 'کاربر',
            meta: `${row.packName} · ${faNumber(row.tokens)} توکن · ${toman(row.price)}`,
            date: faDate(row.timeStamp),
          }))}
        />
      </section>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-gray-500">
        <Icon className="h-4 w-4" />
        <p className="text-xs">{label}</p>
      </div>
      <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
      {hint ? <p className="mt-1 text-[11px] text-gray-400">{hint}</p> : null}
    </div>
  );
}

function MiniList({
  title,
  href,
  empty,
  rows,
}: {
  title: string;
  href: string;
  empty: string;
  rows: { id: string; title: string; meta: string; date: string }[];
}) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        <Link href={href} className="text-xs text-teal-700 hover:underline">
          همه
        </Link>
      </div>
      {rows.length ? (
        <div className="divide-y divide-gray-100">
          {rows.map((row) => (
            <div key={row.id} className="flex items-start justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-gray-900">{row.title}</p>
                <p className="truncate text-xs text-gray-500">{row.meta}</p>
              </div>
              <p className="shrink-0 text-xs text-gray-400">{row.date}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="py-6 text-sm text-gray-500">{empty}</p>
      )}
    </section>
  );
}
