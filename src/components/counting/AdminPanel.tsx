'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { BadgePercent, LogIn, Receipt, Ticket, UserX, Users } from 'lucide-react';
import { createDiscountCode, deleteDiscountCode, updateDiscountCode } from '@/actions/admin';
import { cycleLabel } from '@/lib/plans';
import { faDate, faNumber, toman } from '@/lib/format';
import { redirectIfUnauthorized } from '@/lib/session-client';
import { Button, Input, toast } from '@/ui';

type AdminUser = {
  _id: string;
  fullName?: string;
  phonenumber: string;
  city?: string;
  loggedIn: boolean;
  purchaseCount: number;
  totalMonths: number;
  active: boolean;
  remainingDays: number;
  planName?: string;
  endDate?: string;
};

type AdminPurchase = {
  _id: string;
  fullName?: string;
  phonenumber?: string;
  planName?: string;
  billingCycle?: string;
  price?: number;
  originalPrice?: number;
  discountCode?: string;
  startDate?: string;
  endDate?: string;
  active?: boolean;
};

type AdminCode = {
  _id: string;
  code: string;
  percent: number;
  maxUses: number;
  usedCount: number;
  expiresAt?: string;
  active: boolean;
  note?: string;
};

export type AdminOverview = {
  users: AdminUser[];
  purchases: AdminPurchase[];
  codes: AdminCode[];
  stats: { users: number; loggedIn: number; active: number; purchases: number };
};

const TABS = [
  { id: 'all', label: 'همه کاربران', icon: Users },
  { id: 'logged', label: 'واردشده', icon: LogIn },
  { id: 'active', label: 'اشتراک فعال', icon: BadgePercent },
  { id: 'purchases', label: 'خریدها', icon: Receipt },
  { id: 'lapsed', label: 'بدون تمدید', icon: UserX },
  { id: 'codes', label: 'کد تخفیف', icon: Ticket },
] as const;

type TabId = (typeof TABS)[number]['id'];

export function AdminPanel({ overview }: { overview: AdminOverview }) {
  const router = useRouter();
  const [tab, setTab] = useState<TabId>('all');
  const [query, setQuery] = useState('');
  const [minMonths, setMinMonths] = useState('3');
  const [pending, start] = useTransition();
  const [form, setForm] = useState({ code: '', percent: '10', maxUses: '0', note: '' });

  const q = query.trim();
  const months = Math.max(0, Number(minMonths || 0));
  const users = useMemo(() => {
    const list = overview.users.filter((row) => {
      if (!q) return true;
      return [row.fullName, row.phonenumber, row.planName, row.city].join(' ').includes(q);
    });
    if (tab === 'logged') return list.filter((row) => row.loggedIn);
    if (tab === 'active') return list.filter((row) => row.active);
    if (tab === 'lapsed') return list.filter((row) => !row.active && row.totalMonths >= months);
    return list;
  }, [overview.users, q, tab, months]);

  const purchases = useMemo(
    () =>
      overview.purchases.filter((row) => {
        if (!q) return true;
        return [row.fullName, row.phonenumber, row.planName, row.discountCode].join(' ').includes(q);
      }),
    [overview.purchases, q],
  );

  function run(action: () => Promise<{ ok: boolean; message?: string; status?: number }>, success?: string) {
    start(async () => {
      const res = await action();
      if (redirectIfUnauthorized(res)) return;
      if (res.ok) {
        toast.success(success || res.message || 'انجام شد');
        setForm({ code: '', percent: '10', maxUses: '0', note: '' });
        router.refresh();
      } else {
        toast.error(res.message || 'انجام نشد');
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="همه کاربران" value={overview.stats.users} />
        <Stat label="الان وارد شده‌اند" value={overview.stats.loggedIn} />
        <Stat label="اشتراک فعال" value={overview.stats.active} />
        <Stat label="خرید اشتراک" value={overview.stats.purchases} />
      </div>

      <nav className="flex gap-1 overflow-x-auto rounded-2xl border border-gray-200 bg-white p-1 shadow-sm">
        {TABS.map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`flex min-w-0 flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                active ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {tab !== 'codes' ? (
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[220px] flex-1">
            <Input label="جستجو" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          {tab === 'lapsed' ? (
            <div className="w-40">
              <Input
                label="حداقل ماه اشتراک"
                type="number"
                value={minMonths}
                onChange={(e) => setMinMonths(e.target.value)}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {tab === 'lapsed' ? (
        <p className="text-sm text-gray-600">
          کاربرانی که حداقل {faNumber(months)} ماه اشتراک داشته‌اند و الان تمدید نکرده‌اند.
        </p>
      ) : null}

      {tab === 'purchases' ? (
        <PurchaseTable rows={purchases} />
      ) : tab === 'codes' ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
          <section className="h-fit rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold">کد تخفیف جدید</h3>
            <div className="grid gap-3">
              <Input label="کد" value={form.code} onChange={(e) => setForm((s) => ({ ...s, code: e.target.value }))} />
              <Input
                label="درصد تخفیف"
                type="number"
                value={form.percent}
                onChange={(e) => setForm((s) => ({ ...s, percent: e.target.value }))}
              />
              <Input
                label="حداکثر استفاده (۰ یعنی نامحدود)"
                type="number"
                value={form.maxUses}
                onChange={(e) => setForm((s) => ({ ...s, maxUses: e.target.value }))}
              />
              <Input label="یادداشت" value={form.note} onChange={(e) => setForm((s) => ({ ...s, note: e.target.value }))} />
              <Button
                disabled={pending}
                onClick={() =>
                  run(() =>
                    createDiscountCode({
                      code: form.code,
                      percent: Number(form.percent),
                      maxUses: Number(form.maxUses),
                      note: form.note,
                    }),
                  )
                }
              >
                ثبت کد
              </Button>
            </div>
          </section>
          <CodeTable
            rows={overview.codes}
            pending={pending}
            onToggle={(row) => run(() => updateDiscountCode(row._id, { active: !row.active }), row.active ? 'غیرفعال شد' : 'فعال شد')}
            onDelete={(row) => run(() => deleteDiscountCode(row._id), 'حذف شد')}
          />
        </div>
      ) : (
        <UserTable rows={users} />
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{faNumber(value)}</p>
    </div>
  );
}

function UserTable({ rows }: { rows: AdminUser[] }) {
  if (!rows.length) return <Empty message="کاربری در این فهرست نیست" />;
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="p-3 text-right">نام</th>
            <th className="p-3 text-right">موبایل</th>
            <th className="p-3 text-right">ورود</th>
            <th className="p-3 text-right">اشتراک</th>
            <th className="p-3 text-right">مانده</th>
            <th className="p-3 text-right">جمع ماه</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row._id} className="border-t">
              <td className="p-3">{row.fullName || '—'}</td>
              <td className="p-3" dir="ltr">
                {row.phonenumber}
              </td>
              <td className="p-3">{row.loggedIn ? 'وارد شده' : 'خارج'}</td>
              <td className="p-3">{row.active ? row.planName || 'فعال' : 'ندارد'}</td>
              <td className="p-3">{row.active ? `${faNumber(row.remainingDays)} روز` : '—'}</td>
              <td className="p-3">{faNumber(row.totalMonths)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PurchaseTable({ rows }: { rows: AdminPurchase[] }) {
  if (!rows.length) return <Empty message="خریدی ثبت نشده" />;
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="p-3 text-right">کاربر</th>
            <th className="p-3 text-right">طرح</th>
            <th className="p-3 text-right">بازه</th>
            <th className="p-3 text-right">مبلغ</th>
            <th className="p-3 text-right">وضعیت</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row._id} className="border-t">
              <td className="p-3">
                <p>{row.fullName || '—'}</p>
                <p className="text-xs text-gray-500" dir="ltr">
                  {row.phonenumber}
                </p>
              </td>
              <td className="p-3">
                {row.planName} · {cycleLabel(row.billingCycle)}
                {row.discountCode ? <p className="text-xs text-teal-700">{row.discountCode}</p> : null}
              </td>
              <td className="p-3 text-xs">
                {faDate(row.startDate)} تا {faDate(row.endDate)}
              </td>
              <td className="p-3">{toman(row.price)}</td>
              <td className="p-3">{row.active ? 'فعال' : 'تمام‌شده'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CodeTable({
  rows,
  pending,
  onToggle,
  onDelete,
}: {
  rows: AdminCode[];
  pending: boolean;
  onToggle: (row: AdminCode) => void;
  onDelete: (row: AdminCode) => void;
}) {
  if (!rows.length) return <Empty message="هنوز کد تخفیفی نیست" />;
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="p-3 text-right">کد</th>
            <th className="p-3 text-right">درصد</th>
            <th className="p-3 text-right">استفاده</th>
            <th className="p-3 text-right">وضعیت</th>
            <th className="p-3 text-right">عملیات</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row._id} className="border-t">
              <td className="p-3 font-medium">
                {row.code}
                {row.note ? <p className="text-xs font-normal text-gray-500">{row.note}</p> : null}
              </td>
              <td className="p-3">{faNumber(row.percent)}٪</td>
              <td className="p-3">
                {faNumber(row.usedCount)}
                {row.maxUses ? ` / ${faNumber(row.maxUses)}` : ' / نامحدود'}
              </td>
              <td className="p-3">{row.active ? 'فعال' : 'غیرفعال'}</td>
              <td className="p-3">
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" disabled={pending} onClick={() => onToggle(row)}>
                    {row.active ? 'غیرفعال' : 'فعال'}
                  </Button>
                  <Button size="sm" variant="danger" disabled={pending} onClick={() => onDelete(row)}>
                    حذف
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Empty({ message }: { message: string }) {
  return <p className="rounded-2xl border border-dashed border-gray-200 bg-white p-6 text-sm text-gray-500">{message}</p>;
}
