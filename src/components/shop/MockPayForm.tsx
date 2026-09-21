'use client';

import { useState, useTransition } from 'react';
import { finishMockPayment } from '@/actions/pay';
import { toman } from '@/lib/format';
import { ShopButton } from './ShopUi';

export function MockPayForm({
  authority,
  amount,
  kind,
}: {
  authority: string;
  amount: number;
  kind: string;
}) {
  const [message, setMessage] = useState('');
  const [pending, start] = useTransition();

  function run(success: boolean) {
    start(async () => {
      const res = await finishMockPayment(authority, success);
      if (!res.ok) {
        setMessage(res.message || 'پرداخت ناموفق بود');
        if (!success) window.location.href = `/order/failed?message=${encodeURIComponent(res.message || 'پرداخت لغو شد')}`;
        return;
      }
      if (kind === 'subscription' || res.data?.kind === 'subscription') {
        window.location.href = res.data?.redirectUrl || '/counting/profile?tab=subscription&paid=1';
        return;
      }
      const ids = (res.data?.invoices || []).map((invoice) => invoice.id).join(',');
      window.location.href = `/order/success?paid=1&ids=${encodeURIComponent(ids)}`;
    });
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16" dir="rtl">
      <p className="text-xs text-zinc-500">درگاه آزمایشی باسار</p>
      <h1 className="mt-2 text-2xl font-semibold text-zinc-900">پرداخت آزمایشی</h1>
      <p className="mt-3 text-sm text-zinc-600">
        زرین‌پال در این محیط تنظیم نشده. مبلغ {toman(amount)} را اینجا تایید یا رد کنید.
      </p>
      {message ? <p className="mt-3 text-sm text-rose-700">{message}</p> : null}
      <div className="mt-6 flex gap-3">
        <ShopButton type="button" className="flex-1" disabled={pending} onClick={() => run(true)}>
          پرداخت موفق
        </ShopButton>
        <ShopButton type="button" variant="outline" className="flex-1" disabled={pending} onClick={() => run(false)}>
          انصراف
        </ShopButton>
      </div>
    </div>
  );
}
