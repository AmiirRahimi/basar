'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { compactToman, faNumber, toman } from '@/lib/format';
import { persianYearMonth } from '@/lib/checks';

export type MonthlySale = { label: string; amount?: number; count?: number };

export function DashboardCharts({
  sales,
  monthlySales,
  dueTotal,
  returnedTotal,
  debtTotal,
  debtors,
}: {
  sales: {
    week?: { amount?: number; count?: number };
    month?: { amount?: number; count?: number };
    year?: { amount?: number; count?: number };
  };
  monthlySales: MonthlySale[];
  dueTotal: number;
  returnedTotal: number;
  debtTotal: number;
  debtors: { _id: string; name: string; remaining: number }[];
}) {
  const currentMonth = Number(persianYearMonth().split('/')[1] || 0);
  const mix = [
    { label: 'سررسید این ماه', value: dueTotal, color: '#d97706' },
    { label: 'چک برگشتی', value: returnedTotal, color: '#e11d48' },
    { label: 'نسیه دفتر', value: debtTotal, color: '#ea580c' },
  ];
  const periods = [
    { label: 'این هفته', value: Number(sales.week?.amount || 0), color: '#0d9488' },
    { label: 'این ماه', value: Number(sales.month?.amount || 0), color: '#0284c7' },
    { label: 'امسال', value: Number(sales.year?.amount || 0), color: '#7c3aed' },
  ];

  return (
    <section className="grid gap-4 lg:grid-cols-3">
      <ChartCard title="فروش ماه‌های امسال" className="lg:col-span-2">
        <MonthBars months={monthlySales} currentMonth={currentMonth} />
      </ChartCard>
      <ChartCard title="چک و نسیه">
        <Donut slices={mix} />
      </ChartCard>
      <ChartCard title="مقایسه فروش">
        <HBars items={periods} />
      </ChartCard>
      <ChartCard title="بیشترین مانده نسیه" className="lg:col-span-2">
        <HBars
          items={debtors.slice(0, 8).map((row, index) => ({
            label: row.name,
            value: Number(row.remaining || 0),
            color: ['#ea580c', '#d97706', '#0d9488', '#0284c7', '#7c3aed', '#be123c', '#365314', '#0369a1'][index],
          }))}
          empty="مانده نسیه‌ای نیست"
        />
      </ChartCard>
    </section>
  );
}

export function ChartCard({
  title,
  children,
  className = '',
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border border-gray-200 bg-white p-4 shadow-sm ${className}`}>
      <h3 className="mb-4 text-sm font-semibold text-gray-900">{title}</h3>
      {children}
    </div>
  );
}

export function MonthBars({
  months,
  currentMonth,
  countLabel = 'فاکتور',
  formatAmount = toman,
}: {
  months: MonthlySale[];
  currentMonth: number;
  countLabel?: string;
  formatAmount?: (value?: number) => string;
}) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(...months.map((row) => Number(row.amount || 0)), 1);
  const hovered = active != null ? months[active] : null;

  return (
    <div>
      <p className="mb-3 text-sm text-gray-600">
        {hovered
          ? `${hovered.label}: ${formatAmount(hovered.amount)} — ${faNumber(hovered.count)} ${countLabel}`
          : 'روی هر ستون بروید تا مبلغ ماه را ببینید'}
      </p>
      <div className="flex h-48 items-end gap-1.5">
        {months.map((row, index) => {
          const amount = Number(row.amount || 0);
          const height = Math.max((amount / max) * 100, amount ? 4 : 0);
          const selected = active === index;
          const current = index + 1 === currentMonth;
          return (
            <button
              key={row.label}
              type="button"
              className="flex min-w-0 flex-1 flex-col items-center gap-1"
              onMouseEnter={() => setActive(index)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(index)}
              onBlur={() => setActive(null)}
              aria-label={`${row.label} ${toman(amount)}`}
            >
              <div className="flex h-40 w-full items-end rounded-md bg-gray-50">
                <span
                  className={`w-full rounded-t-md transition-all ${
                    current ? 'bg-teal-600' : selected ? 'bg-teal-500' : 'bg-teal-300'
                  }`}
                  style={{ height: `${height}%` }}
                />
              </div>
              <span className={`text-[10px] ${current ? 'font-semibold text-teal-800' : 'text-gray-500'}`}>
                {row.label.slice(0, 3)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function HBars({
  items,
  empty,
  formatValue = compactToman,
}: {
  items: { label: string; value: number; color: string }[];
  empty?: string;
  formatValue?: (value: number) => string;
}) {
  const max = Math.max(...items.map((row) => row.value), 1);
  if (!items.length || items.every((row) => row.value <= 0)) {
    return <p className="py-8 text-center text-sm text-gray-500">{empty || 'مقداری برای نمایش نیست'}</p>;
  }
  return (
    <ul className="space-y-3">
      {items.map((row) => (
        <li key={row.label}>
          <div className="mb-1 flex items-center justify-between gap-2 text-sm">
            <span className="truncate">{row.label}</span>
            <span className="shrink-0 font-medium">{formatValue(row.value)}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full"
              style={{ width: `${Math.max((row.value / max) * 100, row.value ? 4 : 0)}%`, backgroundColor: row.color }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function Donut({
  slices,
  formatValue = compactToman,
}: {
  slices: { label: string; value: number; color: string }[];
  formatValue?: (value: number) => string;
}) {
  const total = slices.reduce((sum, row) => sum + row.value, 0);
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const arcs = useMemo(() => {
    if (!total) return [];
    let cursor = 0;
    return slices
      .filter((row) => row.value > 0)
      .map((row) => {
        const length = (row.value / total) * circumference;
        const item = { ...row, dash: `${length} ${circumference - length}`, offset: -cursor };
        cursor += length;
        return item;
      });
  }, [slices, total, circumference]);

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <svg viewBox="0 0 120 120" className="h-36 w-36 shrink-0">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="#f3f4f6" strokeWidth="14" />
        {arcs.map((row) => (
          <circle
            key={row.label}
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke={row.color}
            strokeWidth="14"
            strokeDasharray={row.dash}
            strokeDashoffset={row.offset}
            strokeLinecap="butt"
            transform="rotate(-90 60 60)"
          />
        ))}
        <text x="60" y="56" textAnchor="middle" fill="#6b7280" fontSize="9">
          جمع
        </text>
        <text x="60" y="72" textAnchor="middle" fill="#111827" fontSize="11" fontWeight="600">
          {formatValue(total)}
        </text>
      </svg>
      <ul className="w-full space-y-2 text-sm">
        {slices.map((row) => (
          <li key={row.label} className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: row.color }} />
              {row.label}
            </span>
            <span className="font-medium">{formatValue(row.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
