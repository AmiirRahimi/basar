'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setWebsiteOrderStatus } from '@/actions/admin';
import { faDate, faNumber, toman } from '@/lib/format';
import { redirectIfUnauthorized } from '@/lib/session-client';
import { WEBSITE_ORDER_STATUSES, type WebsiteOrderBoard } from '@/lib/website-orders';
import { toast } from '@/ui';

export function WebsiteOrdersBoard({ board }: { board: WebsiteOrderBoard }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState('');
  const [pending, start] = useTransition();

  function changeStatus(id: string, status: string) {
    setPendingId(id);
    start(async () => {
      const res = await setWebsiteOrderStatus(id, status);
      setPendingId('');
      if (redirectIfUnauthorized(res)) return;
      if (!res.ok) {
        toast.error(res.message || 'وضعیت عوض نشد');
        return;
      }
      toast.success(res.message || 'وضعیت عوض شد');
      router.refresh();
    });
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="فروش وب‌سایت" value={toman(board.stats.total)} hint={`${faNumber(board.stats.orders)} سفارش`} />
        <Metric label="فروش این ماه" value={toman(board.stats.thisMonth)} hint={`${faNumber(board.stats.buyers)} خریدار`} />
        <Metric label="مانده پرداخت‌نشده" value={toman(board.stats.unpaid)} hint="سفارش‌های لغوشده حساب نشده" />
        <Metric label="لغو شده" value={faNumber(board.stats.cancelled)} hint="از جمع فروش کنار گذاشته شده" />
      </div>

      <div className="flex flex-wrap gap-2">
        {board.statusCounts.map((item) => (
          <span key={item.id} className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-600">
            {item.label} · {faNumber(item.count)}
          </span>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900">خرید هر کاربر</h2>
          <p className="mt-1 text-sm text-gray-500">جمع سفارش‌های وب‌سایت، بدون سفارش لغوشده.</p>
          {board.buyers.length ? (
            <ul className="mt-4 divide-y divide-gray-100">
              {board.buyers.map((buyer) => (
                <li key={`${buyer.phone}-${buyer.name}`} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="font-medium text-gray-900">{buyer.name || 'خریدار'}</p>
                    <p className="text-xs text-gray-500" dir="ltr">
                      {buyer.phone || 'بدون شماره'} · {faNumber(buyer.orders)} سفارش
                    </p>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-gray-900">{toman(buyer.total)}</p>
                    <p className="text-[11px] text-gray-400">{buyer.lastOrder ? faDate(buyer.lastOrder) : ''}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <Empty text="هنوز خریدی از وب‌سایت ثبت نشده است." />
          )}
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900">پرداخت‌های وب‌سایت</h2>
          <p className="mt-1 text-sm text-gray-500">پرداخت‌هایی که به سفارش وب‌سایت وصل شده‌اند.</p>
          {board.payments.length ? (
            <ul className="mt-4 divide-y divide-gray-100">
              {board.payments.map((payment) => (
                <li key={payment.id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="font-medium text-gray-900">
                      {payment.customerName || 'خریدار'} · فاکتور {faNumber(payment.invoiceNumber)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {payment.kind}
                      {payment.date ? ` · ${faDate(payment.date)}` : ''}
                      {payment.description ? ` · ${payment.description}` : ''}
                    </p>
                  </div>
                  <p className="text-sm font-medium text-gray-900">{toman(payment.amount)}</p>
                </li>
              ))}
            </ul>
          ) : (
            <Empty text="پرداختی برای سفارش‌های وب‌سایت ثبت نشده است." />
          )}
        </section>
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900">آخرین سفارش‌ها</h2>
        <p className="mt-1 text-sm text-gray-500">وضعیت را عوض کنید تا خریدار همان را در حساب خودش ببیند.</p>
        {board.orders.length ? (
          <ul className="mt-4 space-y-3">
            {board.orders.map((order) => (
              <li key={order.id} className="rounded-2xl border border-gray-100 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-gray-900">
                      فاکتور {faNumber(order.invoiceNumber)} · {order.customerName || 'خریدار'}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {[order.customerPhone, order.storeName, order.brandName, order.date ? faDate(order.date) : '']
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                    {order.address ? <p className="mt-1 text-xs text-gray-500">{order.address}</p> : null}
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-gray-900">{toman(order.total)}</p>
                    <p className="text-[11px] text-gray-400">
                      {order.paidAmount >= order.total && order.total > 0
                        ? 'پرداخت شده'
                        : order.paidAmount > 0
                          ? `پرداخت ${toman(order.paidAmount)}`
                          : 'پرداخت نشده'}
                    </p>
                  </div>
                </div>
                {order.lines.length ? (
                  <ul className="mt-3 space-y-1 text-sm text-gray-600">
                    {order.lines.map((line, index) => (
                      <li key={`${order.id}-${index}`}>
                        {line.name}
                        {line.packsLabel ? ` · ${line.packsLabel}` : ''} · {toman(line.total)}
                      </li>
                    ))}
                  </ul>
                ) : null}
                <label className="mt-3 flex max-w-xs flex-col gap-1 text-xs text-gray-500">
                  وضعیت سفارش
                  <select
                    className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900"
                    value={order.status}
                    disabled={pending && pendingId === order.id}
                    onChange={(event) => changeStatus(order.id, event.target.value)}
                  >
                    {WEBSITE_ORDER_STATUSES.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
              </li>
            ))}
          </ul>
        ) : (
          <Empty text="سفارشی از وب‌سایت نرسیده است." />
        )}
      </section>
    </div>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
      {hint ? <p className="mt-1 text-[11px] text-gray-400">{hint}</p> : null}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="mt-4 rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-500">{text}</p>;
}
