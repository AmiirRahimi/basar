'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { BadgePercent, MessageSquare, ShoppingBag, Sparkles, Users } from 'lucide-react';
import type { AdminOverview } from '@/components/counting/AdminPanel';
import type { UsageReport } from '@/components/counting/AdminUsageBoard';
import type { WebsiteOrderBoard } from '@/lib/website-orders';
import { ChartCard, Donut, HBars, MonthBars } from '@/components/counting/DashboardCharts';
import { PERSIAN_MONTHS, persianYearMonth } from '@/lib/checks';
import { faDate, faNumber, toman } from '@/lib/format';

export function AdminDashboard({
  overview,
  usage,
  website,
}: {
  overview: AdminOverview;
  usage: UsageReport;
  website?: WebsiteOrderBoard | null;
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
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
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
        {website ? (
          <Stat
            icon={ShoppingBag}
            label="فروش وب‌سایت"
            value={toman(website.stats.total)}
            hint={`این ماه ${toman(website.stats.thisMonth)} · ${faNumber(website.stats.orders)} سفارش`}
            href="/admin/orders"
          />
        ) : null}
      </div>

      {website ? (
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-gray-900">آخرین سفارش‌های وب‌سایت</h2>
              <p className="mt-1 text-sm text-gray-500">
                {faNumber(website.stats.buyers)} خریدار · مانده پرداخت‌نشده {toman(website.stats.unpaid)}
              </p>
            </div>
            <Link href="/admin/orders" className="text-sm text-teal-700 hover:underline">
              سفارش‌ها و پرداخت‌ها
            </Link>
          </div>
          {website.orders.length ? (
            <ul className="mt-4 divide-y divide-gray-100">
              {website.orders.slice(0, 5).map((order) => (
                <li key={order.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      فاکتور {faNumber(order.invoiceNumber)} · {order.customerName || 'خریدار'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {order.statusLabel}
                      {order.date ? ` · ${faDate(order.date)}` : ''}
                    </p>
                  </div>
                  <p className="text-sm font-medium text-gray-900">{toman(order.total)}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-gray-500">هنوز سفارشی از وب‌سایت ثبت نشده است.</p>
          )}
        </section>
      ) : null}

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
