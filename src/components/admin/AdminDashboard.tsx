'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { BadgePercent, MessageSquare, Sparkles, Users } from 'lucide-react';
import type { AdminOverview } from '@/components/counting/AdminPanel';
import type { UsageReport } from '@/components/counting/AdminUsageBoard';
import { ChartCard, Donut, HBars, MonthBars } from '@/components/counting/DashboardCharts';
import { PERSIAN_MONTHS, persianYearMonth } from '@/lib/checks';
import { faNumber, toman } from '@/lib/format';

export function AdminDashboard({
  overview,
  usage,
}: {
  overview: AdminOverview;
  usage: UsageReport;
}) {
  const currentMonth = Number(persianYearMonth().split('/')[1] || 0);
  const yearKey = persianYearMonth().slice(0, 4);
  const unanswered = Number(overview.stats.unansweredMessages || 0);
  const waiting = Number(overview.stats.waitingConversations || 0);

  const monthlyLogins = useMemo(() => {
    const months = PERSIAN_MONTHS.map((label) => ({ label, amount: 0, count: 0 }));
    for (const user of overview.users) {
      const key = persianYearMonth(user.registeredAt);
      const [year, month] = key.split('/');
      if (year !== yearKey) continue;
      const index = Number(month) - 1;
      if (index < 0 || index > 11) continue;
      months[index].count += 1;
      months[index].amount += 1;
    }
    return months;
  }, [overview.users, yearKey]);

  const monthlySubs = useMemo(
    () =>
      usage.months.map((row) => ({
        label: row.label,
        amount: Number(row.subscriptionRevenue || 0),
        count: Number(row.subscriptions || 0),
      })),
    [usage.months],
  );

  const monthlyTokens = useMemo(
    () =>
      usage.months.map((row) => ({
        label: row.label,
        amount: Number(row.revenue || 0),
        count: Number(row.bought || 0),
      })),
    [usage.months],
  );

  return (
    <div className="space-y-4" dir="rtl">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          icon={Users}
          label="کاربران واردشده"
          value={faNumber(overview.stats.loggedIn)}
          hint={`از ${faNumber(overview.stats.users)} حساب`}
        />
        <Stat
          icon={MessageSquare}
          label="پیام بی‌پاسخ"
          value={faNumber(unanswered)}
          hint={waiting ? `${faNumber(waiting)} گفتگو منتظر پاسخ` : 'گفتگوی معوقی نیست'}
          href="/admin/messages"
        />
        <Stat
          icon={BadgePercent}
          label="سود اشتراک"
          value={toman(usage.stats.subscriptionRevenueTotal)}
          hint={`این ماه ${toman(usage.stats.subscriptionRevenueThisMonth)}`}
        />
        <Stat
          icon={Sparkles}
          label="سود توکن تصویر"
          value={toman(usage.stats.tokenRevenue)}
          hint={`این ماه ${toman(usage.stats.tokenRevenueThisMonth)}`}
        />
      </div>

      <section className="grid gap-4 lg:grid-cols-3">
        <ChartCard title="ورود و ثبت‌نام کاربران" className="lg:col-span-2">
          <MonthBars
            months={monthlyLogins}
            currentMonth={currentMonth}
            countLabel="کاربر"
            formatAmount={(value) => faNumber(value)}
          />
        </ChartCard>
        <ChartCard title="وضعیت ورود">
          <Donut
            slices={[
              { label: 'الان وارد هستند', value: overview.stats.loggedIn, color: '#0d9488' },
              {
                label: 'خارج از حساب',
                value: Math.max(0, overview.stats.users - overview.stats.loggedIn),
                color: '#d1d5db',
              },
            ]}
            formatValue={faNumber}
          />
        </ChartCard>
        <ChartCard title="پیام‌های بی‌پاسخ">
          <HBars
            items={[
              { label: 'پیام خوانده‌نشده', value: unanswered, color: '#e11d48' },
              { label: 'گفتگوی منتظر پاسخ', value: waiting, color: '#d97706' },
            ]}
            empty="پیام بی‌پاسخی نیست"
            formatValue={faNumber}
          />
          <Link href="/admin/messages" className="mt-3 inline-block text-xs text-teal-700 hover:underline">
            رفتن به پیام‌ها
          </Link>
        </ChartCard>
        <ChartCard title="سود اشتراک امسال" className="lg:col-span-2">
          <MonthBars months={monthlySubs} currentMonth={currentMonth} countLabel="خرید" />
        </ChartCard>
        <ChartCard title="سود توکن تصویر امسال" className="lg:col-span-2">
          <MonthBars months={monthlyTokens} currentMonth={currentMonth} countLabel="توکن" />
        </ChartCard>
        <ChartCard title="مقایسه سود">
          <HBars
            items={[
              { label: 'اشتراک (کل)', value: usage.stats.subscriptionRevenueTotal, color: '#0d9488' },
              { label: 'توکن تصویر (کل)', value: usage.stats.tokenRevenue, color: '#7c3aed' },
              { label: 'اشتراک این ماه', value: usage.stats.subscriptionRevenueThisMonth, color: '#0284c7' },
              { label: 'توکن این ماه', value: usage.stats.tokenRevenueThisMonth, color: '#be123c' },
            ]}
          />
        </ChartCard>
      </section>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  hint,
  href,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  hint?: string;
  href?: string;
}) {
  const body = (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-gray-500">
        <Icon className="h-4 w-4" />
        <p className="text-xs">{label}</p>
      </div>
      <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
      {hint ? <p className="mt-1 text-[11px] text-gray-400">{hint}</p> : null}
    </div>
  );
  return href ? (
    <Link href={href} className="block transition hover:opacity-90">
      {body}
    </Link>
  ) : (
    body
  );
}
