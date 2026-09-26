'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { refreshDollarPrice, saveDollarPriceSettings, saveFabricPrices } from '@/actions/market-prices';
import type { AdminMarketPrices, DollarInterval } from '@/lib/market-prices';
import { DOLLAR_INTERVALS } from '@/lib/market-prices';
import { faDate, faNumber, faTime } from '@/lib/format';
import { redirectIfUnauthorized } from '@/lib/session-client';
import { PriceField } from '@/components/accounting/Price';
import { Button, Input, Select, toast } from '@/ui';

function shown(value: number | null, unit: string) {
  if (value == null) return 'هنوز ثبت نشده';
  return `${faNumber(value)} ${unit}`;
}

function when(value: string | null) {
  if (!value) return '';
  return `${faDate(value)}، ${faTime(value)}`;
}

type FabricDraft = { id: string; label: string; unit: string; value: number };

function blankFabric(): FabricDraft {
  return { id: crypto.randomUUID(), label: '', unit: 'تومان', value: 0 };
}

export function MarketPricesBoard({ prices }: { prices: AdminMarketPrices }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [url, setUrl] = useState(prices.dollar.url);
  const [path, setPath] = useState(prices.dollar.path);
  const [interval, setInterval] = useState<DollarInterval>(prices.dollar.interval);
  const [dollarUnit, setDollarUnit] = useState(prices.dollar.unit);
  const [fabrics, setFabrics] = useState<FabricDraft[]>(() =>
    prices.fabrics.length
      ? prices.fabrics.map((item) => ({ id: item.id, label: item.label, unit: item.unit, value: item.value }))
      : [blankFabric()],
  );

  const dollarInput = { url, path, interval, unit: dollarUnit };

  function saveDollar() {
    start(async () => {
      const res = await saveDollarPriceSettings(dollarInput);
      if (redirectIfUnauthorized(res)) return;
      if (!res.ok) {
        toast.error(res.message || 'ذخیره نشد');
        return;
      }
      toast.success(res.message || 'ذخیره شد');
      router.refresh();
    });
  }

  function pullDollar() {
    start(async () => {
      const res = await refreshDollarPrice(dollarInput);
      if (redirectIfUnauthorized(res)) return;
      if (!res.ok) {
        toast.error(res.message || 'قیمت خوانده نشد');
        return;
      }
      toast.success(res.message || 'قیمت دلار به‌روز شد');
      router.refresh();
    });
  }

  function updateFabric(id: string, patch: Partial<FabricDraft>) {
    setFabrics((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function saveFabrics() {
    start(async () => {
      const res = await saveFabricPrices({ fabrics });
      if (redirectIfUnauthorized(res)) return;
      if (!res.ok) {
        toast.error(res.message || 'ذخیره نشد');
        return;
      }
      toast.success(res.message || 'ذخیره شد');
      router.refresh();
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2" dir="rtl">
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900">قیمت دلار</h2>
        <p className="mt-1 text-sm leading-7 text-gray-500">
          آدرس API و مسیر عدد در پاسخ را بنویسید. اگر پاسخ {'{ "price": 90000 }'} باشد، مسیر را price بگذارید. اگر عدد داخل
          شیء دیگری است، مثل data.usd یا items[0].value بنویسید. هر ساعت، هر روز، یا هر وقت خودتان بخواهید می‌توانید قیمت را
          تازه کنید.
        </p>
        <div className="mt-4 space-y-3">
          <Input
            label="آدرس API"
            dir="ltr"
            placeholder="https://example.com/usd"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
          />
          <Input
            label="مسیر مقدار در پاسخ"
            dir="ltr"
            placeholder="price یا data.usd"
            hint="خالی بگذارید اگر خود پاسخ فقط یک عدد است"
            value={path}
            onChange={(event) => setPath(event.target.value)}
          />
          <Select
            label="به‌روزرسانی"
            value={interval}
            options={DOLLAR_INTERVALS.map((item) => ({ value: item.id, label: item.label }))}
            onChange={(value) => setInterval((value as DollarInterval) || 'manual')}
          />
          <Input label="واحد" value={dollarUnit} onChange={(event) => setDollarUnit(event.target.value)} />
        </div>
        <p className="mt-4 text-sm text-gray-700">
          قیمت فعلی: <span className="font-semibold">{shown(prices.dollar.value, prices.dollar.unit)}</span>
          {when(prices.dollar.updatedAt) ? <span className="text-gray-500"> — {when(prices.dollar.updatedAt)}</span> : null}
        </p>
        {prices.dollar.error ? <p className="mt-1 text-sm text-rose-600">{prices.dollar.error}</p> : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button disabled={pending} onClick={saveDollar}>
            {pending ? 'در حال ذخیره...' : 'ذخیره تنظیمات'}
          </Button>
          <Button variant="outline" disabled={pending} onClick={pullDollar}>
            دریافت قیمت الان
          </Button>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900">قیمت پارچه‌ها</h2>
        <p className="mt-1 text-sm leading-7 text-gray-500">
          برای هر پارچه یک نام و قیمت بگذارید. هر وقت خواستید یکی را عوض کنید، یکی اضافه کنید، یا یکی را بردارید. همه روی
          داشبورد حسابداری دیده می‌شوند.
        </p>
        <div className="mt-4 space-y-3">
          {fabrics.map((fabric, index) => (
            <div key={fabric.id} className="space-y-3 rounded-xl border border-gray-200 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-gray-700">پارچه {faNumber(index + 1)}</p>
                <Button
                  type="button"
                  variant="danger"
                  disabled={pending}
                  onClick={() => setFabrics((current) => current.filter((item) => item.id !== fabric.id))}
                >
                  حذف
                </Button>
              </div>
              <Input label="نام" value={fabric.label} onChange={(event) => updateFabric(fabric.id, { label: event.target.value })} />
              <PriceField
                label="قیمت"
                value={fabric.value || ''}
                onChange={(value) => updateFabric(fabric.id, { value })}
              />
              <Input
                label="واحد"
                hint="مثلاً تومان یا تومان / متر"
                value={fabric.unit}
                onChange={(event) => updateFabric(fabric.id, { unit: event.target.value })}
              />
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" variant="outline" disabled={pending} onClick={() => setFabrics((current) => [...current, blankFabric()])}>
            افزودن پارچه
          </Button>
          <Button disabled={pending} onClick={saveFabrics}>
            {pending ? 'در حال ذخیره...' : 'ذخیره قیمت پارچه‌ها'}
          </Button>
        </div>
      </section>
    </div>
  );
}
