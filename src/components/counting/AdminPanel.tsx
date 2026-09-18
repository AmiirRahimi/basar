'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createColumnHelper } from '@tanstack/react-table';
import { BadgePercent, LogIn, Receipt, Ticket, UserX, Users } from 'lucide-react';
import { createDiscountCode, deleteDiscountCode, updateDiscountCode } from '@/actions/admin';
import { cycleLabel } from '@/lib/plans';
import { faDate, faNumber, toman } from '@/lib/format';
import { redirectIfUnauthorized } from '@/lib/session-client';
import { Button, Input, MultiSelect, toast } from '@/ui';
import { SearchableTable } from './SearchableTable';

const selectLabels = {
  search: 'جستجو',
  remove: 'حذف انتخاب',
  removeAll: 'حذف همه',
  noOptionsFound: 'موردی یافت نشد',
};

function userOptionLabel(user: { fullName?: string; phonenumber?: string }) {
  return [user.fullName, user.phonenumber].filter(Boolean).join(' — ') || 'بدون نام';
}

function randomCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

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
  userIds?: string[];
  users?: { _id: string; fullName?: string; phonenumber?: string }[];
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
  const [form, setForm] = useState({ code: '', percent: '10', maxUses: '0', note: '', _userIds: [] as string[] });

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

  const userOptions = overview.users.map((user) => ({
    value: user._id,
    label: userOptionLabel(user),
  }));

  function createForUser(user: AdminUser) {
    setForm({
      code: randomCode(),
      percent: '10',
      maxUses: '1',
      note: userOptionLabel(user),
      _userIds: [user._id],
    });
    setTab('codes');
  }

  function run(action: () => Promise<{ ok: boolean; message?: string; status?: number }>, success?: string) {
    start(async () => {
      const res = await action();
      if (redirectIfUnauthorized(res)) return;
      if (res.ok) {
        toast.success(success || res.message || 'انجام شد');
        setForm({ code: '', percent: '10', maxUses: '0', note: '', _userIds: [] });
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
        <div className="grid gap-4 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
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
              <MultiSelect
                label="کاربران"
                value={form._userIds}
                onChange={(v) => setForm((s) => ({ ...s, _userIds: v.map(String) }))}
                options={userOptions}
                searchable
                labels={selectLabels}
              />
              <p className="text-xs text-gray-500">خالی یعنی برای همه. یک نفر یا چند نفر را انتخاب کنید تا کد فقط برای همان‌ها باشد.</p>
              <Button
                disabled={pending}
                onClick={() =>
                  run(() =>
                    createDiscountCode({
                      code: form.code,
                      percent: Number(form.percent),
                      maxUses: Number(form.maxUses),
                      note: form.note,
                      _userIds: form._userIds,
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
        <UserTable rows={users} onCreateCode={createForUser} />
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

function UserTable({ rows, onCreateCode }: { rows: AdminUser[]; onCreateCode: (row: AdminUser) => void }) {
  const helper = createColumnHelper<AdminUser>();
  const columns = useMemo(
    () => [
      helper.accessor('fullName', { header: 'نام', cell: (info) => info.getValue() || '—' }),
      helper.accessor('phonenumber', { header: 'موبایل', cell: (info) => <span dir="ltr">{info.getValue()}</span> }),
      helper.accessor('loggedIn', { header: 'ورود', cell: (info) => (info.getValue() ? 'وارد شده' : 'خارج') }),
      helper.accessor((row) => (row.active ? row.planName || 'فعال' : 'ندارد'), {
        id: 'subscription',
        header: 'اشتراک',
      }),
      helper.accessor('remainingDays', {
        header: 'مانده',
        cell: ({ row }) => (row.original.active ? `${faNumber(row.original.remainingDays)} روز` : '—'),
      }),
      helper.accessor('totalMonths', { header: 'جمع ماه', cell: (info) => faNumber(info.getValue()) }),
      helper.accessor('city', { header: 'شهر', cell: (info) => info.getValue() || '—' }),
      helper.accessor('purchaseCount', { header: 'تعداد خرید', cell: (info) => faNumber(info.getValue()) }),
      helper.accessor('endDate', { header: 'پایان اشتراک', cell: (info) => faDate(info.getValue()) }),
      helper.display({
        id: 'actions',
        header: 'عملیات',
        enableHiding: false,
        cell: ({ row }) => (
          <Button size="sm" variant="outline" onClick={() => onCreateCode(row.original)}>
            کد تخفیف
          </Button>
        ),
      }),
    ],
    [onCreateCode],
  );
  return (
    <SearchableTable
      storageKey="admin-users"
      data={rows}
      columns={columns}
      getRowId={(row) => String(row._id)}
      extraSearch={(row) =>
        [row.loggedIn ? 'وارد شده' : 'خارج', row.active ? row.planName || 'فعال' : 'ندارد', faNumber(row.remainingDays), faNumber(row.totalMonths)].join(' ')
      }
      emptyMessage="کاربری در این فهرست نیست"
    />
  );
}

function PurchaseTable({ rows }: { rows: AdminPurchase[] }) {
  const helper = createColumnHelper<AdminPurchase>();
  const columns = useMemo(
    () => [
      helper.accessor('fullName', { header: 'کاربر', cell: (info) => info.getValue() || '—' }),
      helper.accessor('planName', { header: 'طرح', cell: (info) => info.getValue() || '—' }),
      helper.accessor('startDate', {
        id: 'range',
        header: 'بازه',
        cell: ({ row }) => `${faDate(row.original.startDate)} تا ${faDate(row.original.endDate)}`,
      }),
      helper.accessor('price', { header: 'مبلغ', cell: (info) => toman(info.getValue()) }),
      helper.accessor('active', { header: 'وضعیت', cell: (info) => (info.getValue() ? 'فعال' : 'تمام‌شده') }),
      helper.accessor('phonenumber', { header: 'موبایل', cell: (info) => <span dir="ltr">{info.getValue() || '—'}</span> }),
      helper.accessor('billingCycle', { header: 'دوره', cell: (info) => cycleLabel(info.getValue()) }),
      helper.accessor('discountCode', { header: 'کد تخفیف', cell: (info) => info.getValue() || '—' }),
      helper.accessor('originalPrice', { header: 'مبلغ اصلی', cell: (info) => toman(info.getValue()) }),
    ],
    [],
  );
  return (
    <SearchableTable
      storageKey="admin-purchases"
      data={rows}
      columns={columns}
      getRowId={(row) => String(row._id)}
      extraSearch={(row) =>
        [
          row.phonenumber,
          cycleLabel(row.billingCycle),
          row.discountCode,
          toman(row.price),
          row.active ? 'فعال' : 'تمام‌شده',
          faDate(row.startDate),
          faDate(row.endDate),
        ].join(' ')
      }
      emptyMessage="خریدی ثبت نشده"
    />
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
  const helper = createColumnHelper<AdminCode>();
  const columns = useMemo(
    () => [
      helper.accessor('code', { header: 'کد', cell: (info) => info.getValue() }),
      helper.accessor('percent', { header: 'درصد', cell: (info) => `${faNumber(info.getValue())}٪` }),
      helper.accessor((row) => row.users?.map((user) => userOptionLabel(user)).join('، ') || 'همه', {
        id: 'users',
        header: 'کاربران',
      }),
      helper.accessor('usedCount', {
        header: 'استفاده',
        cell: ({ row }) =>
          `${faNumber(row.original.usedCount)}${row.original.maxUses ? ` / ${faNumber(row.original.maxUses)}` : ' / نامحدود'}`,
      }),
      helper.accessor('active', { header: 'وضعیت', cell: (info) => (info.getValue() ? 'فعال' : 'غیرفعال') }),
      helper.accessor('note', { header: 'یادداشت', cell: (info) => info.getValue() || '—' }),
      helper.accessor('expiresAt', { header: 'انقضا', cell: (info) => faDate(info.getValue()) }),
      helper.accessor('maxUses', { header: 'سقف استفاده', cell: (info) => (info.getValue() ? faNumber(info.getValue()) : 'نامحدود') }),
      helper.display({
        id: 'actions',
        header: 'عملیات',
        enableHiding: false,
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" disabled={pending} onClick={() => onToggle(row.original)}>
              {row.original.active ? 'غیرفعال' : 'فعال'}
            </Button>
            <Button size="sm" variant="danger" disabled={pending} onClick={() => onDelete(row.original)}>
              حذف
            </Button>
          </div>
        ),
      }),
    ],
    [onDelete, onToggle, pending],
  );
  return (
    <SearchableTable
      storageKey="admin-codes"
      data={rows}
      columns={columns}
      getRowId={(row) => String(row._id)}
      extraSearch={(row) =>
        [
          row.note,
          row.active ? 'فعال' : 'غیرفعال',
          faNumber(row.percent),
          row.users?.map((user) => userOptionLabel(user)).join(' ') || 'همه',
        ].join(' ')
      }
      emptyMessage="هنوز کد تخفیفی نیست"
    />
  );
}
