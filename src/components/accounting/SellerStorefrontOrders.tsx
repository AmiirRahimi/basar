'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { faDate, faNumber, toman } from '@/lib/format';
import type { ProductShare, StorefrontOrder, StorefrontOrderBoard } from '@/lib/types';

export function SellerStorefrontOrders({
  board,
  shares = [],
}: {
  board: StorefrontOrderBoard;
  shares?: ProductShare[];
}) {
  const { orders, totals } = board;
  const titleByToken = useMemo(() => {
    const map = new Map<string, string>();
    for (const share of shares) {
      const title = share.title || '';
      map.set(share.token, title);
      if (share.slug) map.set(share.slug, title);
    }
    return map;
  }, [shares]);
  const groups = useMemo(() => {
    const map = new Map<string, StorefrontOrder[]>();
    for (const row of orders) {
      const key = row.shareToken || 'بدون لینک';
      const list = map.get(key) || [];
      list.push(row);
      map.set(key, list);
    }
    return [...map.entries()];
  }, [orders]);
  const pendingPayout = totals.pendingPayout ?? orders.reduce((sum, row) => sum + (row.payoutStatus === 'paid' ? 0 : row.sellerPayout), 0);
  const paidPayout = totals.paidPayout ?? orders.reduce((sum, row) => sum + (row.payoutStatus === 'paid' ? row.sellerPayout : 0), 0);

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-gray-900">پرداخت‌های لینک‌ها</h2>
        <p className="mt-1 text-sm text-gray-600">
          هر لینک جدا دیده می‌شود. پرداخت مشتری از درگاه باسار است؛ تا واریز به حساب شما، مبلغ در راه است.
        </p>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
          <p className="text-xs text-gray-500">پرداخت مشتری‌ها</p>
          <p className="mt-1 text-lg font-medium tabular-nums text-gray-900">{toman(totals.total)}</p>
          <p className="text-[11px] text-gray-400">{faNumber(totals.count)} سفارش</p>
        </div>
        <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3">
          <p className="text-xs text-amber-800">در راه برای شما</p>
          <p className="mt-1 text-lg font-medium tabular-nums text-amber-950">{toman(pendingPayout)}</p>
        </div>
        <div className="rounded-2xl border border-teal-100 bg-teal-50 px-4 py-3">
          <p className="text-xs text-teal-800">واریز شده</p>
          <p className="mt-1 text-lg font-medium tabular-nums text-teal-950">{toman(paidPayout)}</p>
        </div>
      </div>

      {groups.length ? (
        <div className="space-y-4">
          {groups.map(([token, rows]) => (
            <article key={token} className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
              <div className="mb-3">
                <h3 className="font-medium text-gray-900">
                  {rows[0]?.shareTitle || titleByToken.get(token) || 'لینک بدون عنوان'}
                </h3>
                <p className="text-[11px] text-gray-400" dir="ltr">
                  {token === 'بدون لینک' ? token : `/s/${token}`}
                </p>
              </div>
              <div className="space-y-3">
                {rows.map((row) => (
                  <div key={row._id} className="rounded-xl border border-white bg-white p-3">
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
                          row.payoutStatus === 'paid' ? 'bg-teal-100 text-teal-950' : 'bg-amber-100 text-amber-950'
                        }`}
                      >
                        {row.payoutStatus === 'paid' ? 'به حساب شما واریز شد' : 'پرداخت از درگاه در راه است'}
                      </span>
                    </div>
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
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-3 text-sm">
                      <p className="text-gray-600">
                        پرداخت مشتری: <span className="font-medium tabular-nums text-gray-900">{toman(row.total)}</span>
                      </p>
                      <p className="text-teal-800">
                        سهم شما: <span className="font-medium tabular-nums">{toman(row.sellerPayout || row.total)}</span>
                      </p>
                      <Link
                        href={`/accounting/invoices/${row._id}`}
                        className="text-xs font-medium text-gray-700 underline-offset-2 hover:underline"
                      >
                        مشاهده فاکتور
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-500">
          هنوز مشتری از لینک شما سفارشی نداده است.
        </p>
      )}
    </section>
  );
}
