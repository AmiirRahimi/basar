'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { refreshDollarPrice, saveDollarPriceSettings, saveFabricPrice } from '@/actions/market-prices';
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

export function MarketPricesBoard({ prices }: { prices: AdminMarketPrices }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [url, setUrl] = useState(prices.dollar.url);
  const [path, setPath] = useState(prices.dollar.path);
  const [interval, setInterval] = useState<DollarInterval>(prices.dollar.interval);
  const [dollarUnit, setDollarUnit] = useState(prices.dollar.unit);
  const [fabricLabel, setFabricLabel] = useState(prices.fabric.label);
  const [fabricUnit, setFabricUnit] = useState(prices.fabric.unit);
  const [fabricValue, setFabricValue] = useState(prices.fabric.value ?? 0);

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

  function saveFabric() {
    start(async () => {
      const res = await saveFabricPrice({ value: fabricValue, unit: fabricUnit, label: fabricLabel });
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
        <h2 className="text-base font-semibold text-gray-900">قیمت پارچه</h2>
        <p className="mt-1 text-sm leading-7 text-gray-500">
          این قیمت را خودتان وارد می‌کنید و هر وقت خواستید عوض می‌کنید. روی داشبورد حسابداری همه کاربران دیده می‌شود.
        </p>
        <div className="mt-4 space-y-3">
          <Input label="نام" value={fabricLabel} onChange={(event) => setFabricLabel(event.target.value)} />
          <PriceField label="قیمت" value={fabricValue || ''} onChange={setFabricValue} />
          <Input
            label="واحد"
            hint="مثلاً تومان یا تومان / متر"
            value={fabricUnit}
            onChange={(event) => setFabricUnit(event.target.value)}
          />
        </div>
        <p className="mt-4 text-sm text-gray-700">
          قیمت فعلی: <span className="font-semibold">{shown(prices.fabric.value, prices.fabric.unit)}</span>
          {when(prices.fabric.updatedAt) ? <span className="text-gray-500"> — {when(prices.fabric.updatedAt)}</span> : null}
        </p>
        <div className="mt-4">
          <Button disabled={pending} onClick={saveFabric}>
            {pending ? 'در حال ذخیره...' : 'ذخیره قیمت پارچه'}
          </Button>
        </div>
      </section>
    </div>
  );
}
