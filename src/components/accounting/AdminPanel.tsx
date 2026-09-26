'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createColumnHelper } from '@tanstack/react-table';
import { BadgePercent, Ban, CircleCheck, LogIn, Receipt, Sparkles, Ticket, UserPlus, UserX, Users } from 'lucide-react';
import { createDiscountCode, deleteDiscountCode, updateDiscountCode } from '@/actions/admin';
import { cycleLabel } from '@/lib/plans';
import { faDate, faNumber, toman } from '@/lib/format';
import { persianYearMonth } from '@/lib/checks';
import { redirectIfUnauthorized } from '@/lib/session-client';
import { recordViewPath } from '@/lib/record-view';
import { Button, Input, MultiSelect, Tabs, toast } from '@/ui';
import { AdminUserEditor, type EditableAdminUser } from './AdminUserEditor';
import { RowActions } from './RowActions';
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
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('');
}

type AdminUser = EditableAdminUser & {
  loggedIn: boolean;
  purchaseCount: number;
  totalMonths: number;
  remainingDays: number;
  active: boolean;
  registeredAt?: string;
  imageTokens?: number;
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
  monthlyPurchases?: { label: string; amount: number; count: number }[];
  codes: AdminCode[];
  stats: {
    users: number;
    loggedIn: number;
    active: number;
    purchases: number;
    newUsersThisMonth?: number;
    newUsersLastMonth?: number;
    purchasesThisMonth?: number;
    purchasesThisMonthAmount?: number;
    purchasesLastMonth?: number;
    purchasesLastMonthAmount?: number;
    unansweredMessages?: number;
    waitingConversations?: number;
  };
};

const TABS = [
  { id: 'all', label: 'همه کاربران', icon: Users },
  { id: 'new', label: 'ثبت‌نام جدید', icon: UserPlus },
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
  const [minMonths, setMinMonths] = useState('3');
  const [pending, start] = useTransition();
  const [form, setForm] = useState({ code: '', percent: '10', maxUses: '0', note: '', _userIds: [] as string[] });
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);

  const months = Math.max(0, Number(minMonths || 0));
  const thisMonthKey = persianYearMonth(new Date());
  const users = useMemo(() => {
    if (tab === 'logged') return overview.users.filter((row) => row.loggedIn);
    if (tab === 'active') return overview.users.filter((row) => row.active);
    if (tab === 'new') return overview.users.filter((row) => persianYearMonth(row.registeredAt) === thisMonthKey);
    if (tab === 'lapsed') return overview.users.filter((row) => !row.active && row.totalMonths >= months);
    return overview.users;
  }, [overview.users, tab, months, thisMonthKey]);

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
        <Stat label="ثبت‌نام این ماه" value={overview.stats.newUsersThisMonth || 0} hint={`ماه قبل ${faNumber(overview.stats.newUsersLastMonth || 0)}`} />
        <Stat label="اشتراک فعال" value={overview.stats.active} />
        <Stat label="الان وارد شده‌اند" value={overview.stats.loggedIn} />
        <Stat label="خرید اشتراک این ماه" value={overview.stats.purchasesThisMonth || 0} hint={toman(overview.stats.purchasesThisMonthAmount || 0)} />
        <Stat label="خرید ماه قبل" value={overview.stats.purchasesLastMonth || 0} hint={toman(overview.stats.purchasesLastMonthAmount || 0)} />
        <Stat label="کل خرید اشتراک" value={overview.stats.purchases} />
      </div>

      <Tabs
        value={tab}
        onChange={(next) => setTab(next as TabId)}
        tabs={TABS.map((item) => ({
          value: item.id,
          label: item.label,
          icon: <item.icon className="h-4 w-4" />,
        }))}
      />

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

      {tab === 'lapsed' ? (
        <p className="text-sm text-gray-600">
          کاربرانی که حداقل {faNumber(months)} ماه اشتراک داشته‌اند و الان تمدید نکرده‌اند.
        </p>
      ) : null}

      {tab === 'purchases' ? (
        <div className="space-y-4">
          <MonthlyPurchaseBars months={overview.monthlyPurchases || []} />
          <PurchaseTable rows={overview.purchases} />
        </div>
      ) : tab === 'codes' ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
          <section className="h-fit rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold">کد تخفیف جدید</h3>
            <div className="grid gap-3">
              <div className="flex items-end gap-2">
                <div className="min-w-0 flex-1">
                  <Input
                    label="کد"
                    dir="ltr"
                    value={form.code}
                    onChange={(e) => setForm((s) => ({ ...s, code: e.target.value }))}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="shrink-0 whitespace-nowrap"
                  icon={<Sparkles className="h-4 w-4" />}
                  onClick={() => setForm((s) => ({ ...s, code: randomCode() }))}
                >
                  ساخت کد تصادفی
                </Button>
              </div>
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
        <UserTable rows={users} onCreateCode={createForUser} onEdit={setEditingUser} />
      )}
      <AdminUserEditor user={editingUser} onClose={() => setEditingUser(null)} />
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{faNumber(value)}</p>
      {hint ? <p className="mt-1 text-[11px] text-gray-400">{hint}</p> : null}
    </div>
  );
}

function MonthlyPurchaseBars({ months }: { months: { label: string; amount: number; count: number }[] }) {
  const max = Math.max(...months.map((row) => Number(row.amount || 0)), 1);
  const current = Number(persianYearMonth().split('/')[1] || 0);
  if (!months.length) return null;
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-gray-900">خرید اشتراک در ماه‌های امسال</h3>
      <div className="flex h-40 items-end gap-1.5">
        {months.map((row, index) => {
          const amount = Number(row.amount || 0);
          const height = Math.max((amount / max) * 100, amount ? 6 : 0);
          const isCurrent = index + 1 === current;
          return (
            <div key={row.label} className="flex min-w-0 flex-1 flex-col items-center gap-1">
              <div className="flex h-32 w-full items-end rounded-md bg-gray-50" title={`${row.label}: ${toman(amount)}`}>
                <span className={`w-full rounded-t-md ${isCurrent ? 'bg-teal-600' : 'bg-teal-300'}`} style={{ height: `${height}%` }} />
              </div>
              <span className={`text-[10px] ${isCurrent ? 'font-semibold text-teal-800' : 'text-gray-500'}`}>
                {row.label.slice(0, 3)}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function UserTable({
  rows,
  onCreateCode,
  onEdit,
}: {
  rows: AdminUser[];
  onCreateCode: (row: AdminUser) => void;
  onEdit: (row: AdminUser) => void;
}) {
  const helper = createColumnHelper<AdminUser>();
  const columns = useMemo(
    () => [
      helper.accessor('fullName', { header: 'نام', cell: (info) => info.getValue() || '—' }),
      helper.accessor('phonenumber', { header: 'موبایل', cell: (info) => <span dir="ltr">{info.getValue()}</span> }),
      helper.accessor('loggedIn', { header: 'ورود', cell: (info) => (info.getValue() ? 'وارد شده' : 'خارج') }),
      helper.accessor('registeredAt', { header: 'ثبت‌نام', cell: (info) => faDate(info.getValue()) }),
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
        enableSorting: false,
        cell: ({ row }) => (
          <RowActions
            viewUrl={recordViewPath('admin-user', String(row.original._id))}
            onEdit={() => onEdit(row.original)}
            extraActions={[
              {
                label: 'کد تخفیف',
                icon: <Ticket className="size-3.5" />,
                onClick: () => onCreateCode(row.original),
              },
            ]}
          />
        ),
      }),
    ],
    [onCreateCode, onEdit],
  );
  return (
    <SearchableTable
      storageKey="admin-users"
      data={rows}
      columns={columns}
      getRowId={(row) => String(row._id)}
      extraSearch={(row) =>
        [
          row.loggedIn ? 'وارد شده' : 'خارج',
          row.active ? row.planName || 'فعال' : 'ندارد',
          row.planId,
          row.billingCycle ? cycleLabel(row.billingCycle) : '',
          row.address,
          row.email,
          faNumber(row.remainingDays),
          faNumber(row.totalMonths),
        ].join(' ')
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
      helper.display({
        id: 'actions',
        header: 'عملیات',
        enableHiding: false,
        enableSorting: false,
        cell: ({ row }) => <RowActions viewUrl={recordViewPath('admin-purchase', String(row.original._id))} />,
      }),
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
        enableSorting: false,
        cell: ({ row }) => (
          <RowActions
            viewUrl={recordViewPath('admin-code', String(row.original._id))}
            extraActions={
              pending
                ? []
                : [
                    {
                      label: row.original.active ? 'غیرفعال' : 'فعال',
                      icon: row.original.active ? <Ban className="size-3.5" /> : <CircleCheck className="size-3.5" />,
                      onClick: () => onToggle(row.original),
                    },
                  ]
            }
            onDelete={pending ? undefined : () => onDelete(row.original)}
          />
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
