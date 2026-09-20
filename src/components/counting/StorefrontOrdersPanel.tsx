'use client';

import { faDate, faNumber, toman } from '@/lib/format';
import { GATEWAY_FEE_PERCENT } from '@/lib/storefront';
import type { StorefrontOrderBoard } from '@/lib/types';

function Money({ amount }: { amount: number }) {
  return <span className="font-medium tabular-nums">{toman(amount)}</span>;
}

export function StorefrontOrdersPanel({ board }: { board: StorefrontOrderBoard }) {
  const fee = board.feePercent || GATEWAY_FEE_PERCENT;
  const { totals, orders } = board;

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-gray-900">سفارش‌های ویترین</h2>
        <p className="mt-1 text-sm text-gray-600">
          پرداخت مشتری از درگاه باسار است. از هر پرداخت {faNumber(fee)}٪ سهم پلتفرم است و باقی باید به فروشنده پرداخت
          شود.
        </p>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
          <p className="text-xs text-gray-500">جمع پرداخت مشتری‌ها</p>
          <p className="mt-1 text-lg text-gray-900">
            <Money amount={totals.total} />
          </p>
          <p className="text-[11px] text-gray-400">{faNumber(totals.count)} سفارش</p>
        </div>
        <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3">
          <p className="text-xs text-amber-800">سهم باسار ({faNumber(fee)}٪)</p>
          <p className="mt-1 text-lg text-amber-950">
            <Money amount={totals.platformFee} />
          </p>
        </div>
        <div className="rounded-2xl border border-teal-100 bg-teal-50 px-4 py-3">
          <p className="text-xs text-teal-800">باید به فروشنده‌ها پرداخت شود</p>
          <p className="mt-1 text-lg text-teal-950">
            <Money amount={totals.sellerPayout} />
          </p>
        </div>
      </div>

      {orders.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-right text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs text-gray-500">
                <th className="px-2 py-2 font-medium">تاریخ</th>
                <th className="px-2 py-2 font-medium">مشتری</th>
                <th className="px-2 py-2 font-medium">فروشنده</th>
                <th className="px-2 py-2 font-medium">فروشگاه</th>
                <th className="px-2 py-2 font-medium">مبلغ</th>
                <th className="px-2 py-2 font-medium">سهم باسار</th>
                <th className="px-2 py-2 font-medium">سهم فروشنده</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((row) => (
                <tr key={row._id} className="border-b border-gray-50">
                  <td className="whitespace-nowrap px-2 py-2 text-gray-600">{faDate(row.timeStamp)}</td>
                  <td className="px-2 py-2">
                    <p className="font-medium text-gray-900">{row.customerName}</p>
                    {row.customerPhone ? (
                      <p className="text-[11px] text-gray-400" dir="ltr">
                        {row.customerPhone}
                      </p>
                    ) : null}
                  </td>
                    <td className="px-2 py-2">
                      <p className="text-gray-900">{row.sellerName}</p>
                      {row.sellerPhone ? (
                        <p className="text-[11px] text-gray-400" dir="ltr">
                          {row.sellerPhone}
                        </p>
                      ) : null}
                    </td>
                  <td className="px-2 py-2 text-gray-700">
                    {[row.brandName, row.storeName].filter(Boolean).join(' · ')}
                  </td>
                  <td className="px-2 py-2">
                    <Money amount={row.total} />
                  </td>
                  <td className="px-2 py-2 text-amber-900">
                    <Money amount={row.platformFee} />
                  </td>
                  <td className="px-2 py-2 text-teal-900">
                    <Money amount={row.sellerPayout} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-500">
          هنوز سفارشی از لینک ویترین ثبت نشده است.
        </p>
      )}
    </section>
  );
}
