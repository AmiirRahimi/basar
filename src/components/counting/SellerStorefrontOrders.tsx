'use client';

import Link from 'next/link';
import { faDate, faNumber, toman } from '@/lib/format';
import type { StorefrontOrderBoard } from '@/lib/types';

export function SellerStorefrontOrders({ board }: { board: StorefrontOrderBoard }) {
  const { orders, totals } = board;

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-gray-900">سفارش مشتریان از لینک</h2>
        <p className="mt-1 text-sm text-gray-600">
          وقتی مشتری از لینک شما سبد ببندد و بپردازد، فاکتور همان مشتری در بخش فاکتور فروشگاهتان ثبت می‌شود. پرداخت از
          درگاه بیرونی باسار است و مبلغ در راه است تا به شما برسد.
        </p>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
          <p className="text-xs text-gray-500">پرداخت مشتری‌ها</p>
          <p className="mt-1 text-lg font-medium tabular-nums text-gray-900">{toman(totals.total)}</p>
          <p className="text-[11px] text-gray-400">{faNumber(totals.count)} سفارش</p>
        </div>
        <div className="rounded-2xl border border-teal-100 bg-teal-50 px-4 py-3">
          <p className="text-xs text-teal-800">مبلغ در راه برای شما</p>
          <p className="mt-1 text-lg font-medium tabular-nums text-teal-950">{toman(totals.sellerPayout)}</p>
          <p className="text-[11px] text-teal-800/70">از درگاه باسار به حساب شما</p>
        </div>
      </div>

      {orders.length ? (
        <div className="space-y-3">
          {orders.map((row) => (
            <article key={row._id} className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
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
                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-medium text-amber-950">
                  پرداخت از درگاه در راه است
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
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-gray-200/80 pt-3 text-sm">
                <p className="text-gray-600">
                  پرداخت مشتری: <span className="font-medium tabular-nums text-gray-900">{toman(row.total)}</span>
                </p>
                <p className="text-teal-800">
                  سهم شما (در راه):{' '}
                  <span className="font-medium tabular-nums">{toman(row.sellerPayout || row.total)}</span>
                </p>
                <Link
                  href={`/counting/invoices/${row._id}`}
                  className="text-xs font-medium text-gray-700 underline-offset-2 hover:underline"
                >
                  مشاهده فاکتور
                </Link>
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
