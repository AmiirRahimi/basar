'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { markStorefrontOrderPaid } from '@/actions/shop';
import { faDate, faNumber, toman } from '@/lib/format';
import { persianYearMonth } from '@/lib/checks';
import { GATEWAY_FEE_PERCENT } from '@/lib/storefront';
import { redirectIfUnauthorized } from '@/lib/session-client';
import type { StorefrontOrder, StorefrontOrderBoard } from '@/lib/types';
import { Button, Checkbox, Input, Select, toast } from '@/ui';

const selectLabels = {
  search: 'جستجو',
  remove: 'حذف انتخاب',
  noOptionsFound: 'موردی یافت نشد',
};

function Money({ amount }: { amount: number }) {
  return <span className="font-medium tabular-nums">{toman(amount)}</span>;
}

function payoutLabel(row: StorefrontOrder) {
  return row.payoutStatus === 'paid' ? 'واریز شده' : 'باید واریز شود';
}

export function StorefrontOrdersPanel({ board }: { board: StorefrontOrderBoard }) {
  const router = useRouter();
  const fee = board.feePercent || GATEWAY_FEE_PERCENT;
  const [q, setQ] = useState('');
  const [seller, setSeller] = useState('');
  const [month, setMonth] = useState('');
  const [payout, setPayout] = useState<'all' | 'pending' | 'paid'>('all');
  const [grouped, setGrouped] = useState(true);
  const [pending, start] = useTransition();

  const sellers = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of board.orders) {
      const key = row.sellerPhone || row.sellerName;
      if (key) map.set(key, row.sellerName);
    }
    return [...map.entries()];
  }, [board.orders]);

  const months = useMemo(() => {
    const keys = [...new Set(board.orders.map((row) => persianYearMonth(row.timeStamp)).filter(Boolean))];
    return keys.sort().reverse();
  }, [board.orders]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return board.orders.filter((row) => {
      if (seller && (row.sellerPhone || row.sellerName) !== seller) return false;
      if (month && persianYearMonth(row.timeStamp) !== month) return false;
      if (payout !== 'all' && (row.payoutStatus || 'pending') !== payout) return false;
      if (!term) return true;
      const hay = [
        row.customerName,
        row.customerPhone,
        row.sellerName,
        row.sellerPhone,
        row.storeName,
        row.brandName,
        row.shareTitle,
        row.shareToken,
        ...(row.lines || []).map((line) => `${line.name} ${line.packsLabel}`),
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(term);
    });
  }, [board.orders, month, payout, q, seller]);

  const totals = useMemo(
    () =>
      filtered.reduce(
        (sum, row) => ({
          total: sum.total + row.total,
          platformFee: sum.platformFee + row.platformFee,
          sellerPayout: sum.sellerPayout + row.sellerPayout,
          pendingPayout: sum.pendingPayout + (row.payoutStatus === 'paid' ? 0 : row.sellerPayout),
          paidPayout: sum.paidPayout + (row.payoutStatus === 'paid' ? row.sellerPayout : 0),
          count: sum.count + 1,
        }),
        { total: 0, platformFee: 0, sellerPayout: 0, pendingPayout: 0, paidPayout: 0, count: 0 },
      ),
    [filtered],
  );

  const groups = useMemo(() => {
    const map = new Map<string, StorefrontOrder[]>();
    for (const row of filtered) {
      const key = row.shareToken || 'بدون لینک';
      const list = map.get(key) || [];
      list.push(row);
      map.set(key, list);
    }
    return [...map.entries()];
  }, [filtered]);

  function mark(row: StorefrontOrder, paid: boolean) {
    start(async () => {
      const res = await markStorefrontOrderPaid(row._id, { paid });
      if (redirectIfUnauthorized(res)) return;
      if (res.ok) {
        toast.success(res.message || 'ثبت شد');
        router.refresh();
      } else toast.error(res.message || 'ثبت نشد');
    });
  }

  function copy(value: string) {
    if (!value) return;
    void navigator.clipboard.writeText(value).then(
      () => toast.success('کپی شد'),
      () => toast.error('کپی نشد'),
    );
  }

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
        <h2 className="text-base font-semibold text-gray-900">سفارش‌های ویترین</h2>
        <p className="mt-1 text-sm text-gray-600">
          پول مشتری در حساب درگاه باسار است. از هر پرداخت {faNumber(fee)}٪ سهم پلتفرم است. باقی را به شبا فروشنده واریز
          کنید و اینجا ثبت کنید.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="جمع پرداخت مشتری‌ها" value={toman(totals.total)} hint={`${faNumber(totals.count)} سفارش`} />
          <Stat label={`سهم باسار (${faNumber(fee)}٪)`} value={toman(totals.platformFee)} />
          <Stat label="باید به فروشنده‌ها پرداخت شود" value={toman(totals.pendingPayout)} tone="warn" />
          <Stat label="واریز شده به فروشنده‌ها" value={toman(totals.paidPayout)} tone="ok" />
        </div>
      </div>

      <div className="grid gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:grid-cols-2 xl:grid-cols-5">
        <Input label="جستجو" value={q} onChange={(e) => setQ(e.target.value)} />
        <Select
          label="فروشنده"
          value={seller}
          onChange={(value) => setSeller(String(value ?? ''))}
          options={[
            { value: '', label: 'همه' },
            ...sellers.map(([key, name]) => ({ value: key, label: name })),
          ]}
          searchable
          labels={selectLabels}
        />
        <Select
          label="ماه"
          value={month}
          onChange={(value) => setMonth(String(value ?? ''))}
          options={[
            { value: '', label: 'همه ماه‌ها' },
            ...months.map((key) => ({ value: key, label: key })),
          ]}
          labels={selectLabels}
        />
        <Select
          label="واریز"
          value={payout === 'all' ? '' : payout}
          onChange={(value) => {
            const next = String(value || 'all');
            setPayout(next === 'pending' || next === 'paid' ? next : 'all');
          }}
          options={[
            { value: '', label: 'همه' },
            { value: 'pending', label: 'باید واریز شود' },
            { value: 'paid', label: 'واریز شده' },
          ]}
          labels={selectLabels}
        />
        <div className="flex items-end pb-2">
          <Checkbox
            checked={grouped}
            onChange={(e) => setGrouped(e.target.checked)}
            label="گروه‌بندی بر اساس لینک"
          />
        </div>
      </div>

      {filtered.length ? (
        grouped ? (
          <div className="space-y-4">
            {groups.map(([token, rows]) => (
              <article key={token} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-gray-900">{rows[0]?.shareTitle || 'لینک بدون عنوان'}</h3>
                    <p className="text-[11px] text-gray-400" dir="ltr">
                      {token === 'بدون لینک' ? token : `/s/${token}`}
                    </p>
                  </div>
                  <p className="text-sm text-gray-600">{faNumber(rows.length)} پرداخت</p>
                </div>
                <div className="space-y-3">
                  {rows.map((row) => (
                    <OrderCard key={row._id} row={row} pending={pending} onMark={mark} onCopy={copy} />
                  ))}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((row) => (
              <OrderCard key={row._id} row={row} pending={pending} onMark={mark} onCopy={copy} />
            ))}
          </div>
        )
      ) : (
        <p className="rounded-xl border border-dashed border-gray-200 bg-white px-4 py-8 text-center text-sm text-gray-500">
          سفارشی با این فیلتر نیست.
        </p>
      )}
    </section>
  );
}

function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: 'warn' | 'ok';
}) {
  const toneClass =
    tone === 'warn'
      ? 'border-amber-100 bg-amber-50'
      : tone === 'ok'
        ? 'border-teal-100 bg-teal-50'
        : 'border-gray-100 bg-gray-50';
  return (
    <div className={`rounded-2xl border px-4 py-3 ${toneClass}`}>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-lg text-gray-900">{value}</p>
      {hint ? <p className="text-[11px] text-gray-400">{hint}</p> : null}
    </div>
  );
}

function OrderCard({
  row,
  pending,
  onMark,
  onCopy,
}: {
  row: StorefrontOrder;
  pending: boolean;
  onMark: (row: StorefrontOrder, paid: boolean) => void;
  onCopy: (value: string) => void;
}) {
  const paid = row.payoutStatus === 'paid';
  return (
    <div className="rounded-2xl border border-gray-100 bg-gray-50/80 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium text-gray-900">{row.customerName}</p>
          {row.customerPhone ? (
            <p className="text-xs text-gray-500" dir="ltr">
              {row.customerPhone}
            </p>
          ) : null}
          <p className="mt-1 text-[11px] text-gray-400">{faDate(row.timeStamp)}</p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
            paid ? 'bg-teal-100 text-teal-950' : 'bg-amber-100 text-amber-950'
          }`}
        >
          {payoutLabel(row)}
        </span>
      </div>
      <p className="mt-2 text-sm text-gray-700">
        فروشنده: {row.sellerName}
        {row.sellerPhone ? ` · ${row.sellerPhone}` : ''}
      </p>
      {row.sellerSheba || row.sellerBankName ? (
        <p className="mt-1 text-xs text-gray-500">
          {row.sellerBankName ? `${row.sellerBankName} · ` : ''}
          <button type="button" className="underline" dir="ltr" onClick={() => onCopy(row.sellerSheba || '')}>
            {row.sellerSheba || 'شبا ثبت نشده'}
          </button>
        </p>
      ) : (
        <p className="mt-1 text-xs text-amber-800">فروشنده هنوز شبا ثبت نکرده است.</p>
      )}
      <ul className="mt-3 space-y-1.5 text-sm">
        {(row.lines || []).map((line, index) => (
          <li key={`${row._id}-${index}`} className="flex justify-between gap-3 text-gray-700">
            <span>
              {line.name}
              <span className="mt-0.5 block text-[11px] text-gray-400">
                {line.packsLabel || `${faNumber(line.count)} عدد`}
              </span>
            </span>
            <span className="shrink-0 tabular-nums">{toman(line.total)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-gray-200/80 pt-3 text-sm">
        <p>
          مبلغ: <Money amount={row.total} /> · سهم باسار: <Money amount={row.platformFee} /> · سهم فروشنده:{' '}
          <Money amount={row.sellerPayout} />
        </p>
        <div className="flex flex-wrap gap-2">
          <Link href={`/accounting/invoices/${row._id}`} className="text-xs font-medium underline">
            مشاهده فاکتور
          </Link>
          <Button
            type="button"
            size="sm"
            variant={paid ? 'outline' : 'primary'}
            disabled={pending}
            onClick={() => onMark(row, !paid)}
          >
            {paid ? 'برگشت به در انتظار' : 'واریز به فروشنده ثبت شد'}
          </Button>
        </div>
      </div>
    </div>
  );
}
