'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { refreshCurrencyNow, saveCurrencyPrices, saveStaticPrices } from '@/actions/market-prices';
import type { AdminMarketPrices } from '@/lib/market-prices';
import { MIN_PRICE_INTERVAL_SECONDS } from '@/lib/market-prices';
import { faDate, faNumber, faTime } from '@/lib/format';
import { redirectIfUnauthorized } from '@/lib/session-client';
import { PriceField } from '@/components/accounting/Price';
import { Button, Input, toast } from '@/ui';

type CurrencyDraft = {
  id: string;
  label: string;
  url: string;
  path: string;
  unit: string;
  intervalSeconds: number;
};

type StaticDraft = { id: string; label: string; unit: string; value: number };

function blankCurrency(): CurrencyDraft {
  return { id: crypto.randomUUID(), label: '', url: '', path: '', unit: 'تومان', intervalSeconds: MIN_PRICE_INTERVAL_SECONDS };
}

function blankStatic(): StaticDraft {
  return { id: crypto.randomUUID(), label: '', unit: 'تومان', value: 0 };
}

function when(value: string | null) {
  if (!value) return '';
  return `${faDate(value)}، ${faTime(value)}`;
}

function SectionHeader({ title, onAdd }: { title: string; onAdd: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      <Button type="button" variant="outline" size="sm" rounded="full" iconOnly aria-label="افزودن" onClick={onAdd}>
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function MarketPricesBoard({ prices }: { prices: AdminMarketPrices }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [currencies, setCurrencies] = useState<CurrencyDraft[]>(() =>
    prices.currencies.length
      ? prices.currencies.map((item) => ({
          id: item.id,
          label: item.label,
          url: item.url,
          path: item.path,
          unit: item.unit,
          intervalSeconds: item.intervalSeconds,
        }))
      : [blankCurrency()],
  );
  const [statics, setStatics] = useState<StaticDraft[]>(() =>
    prices.statics.length
      ? prices.statics.map((item) => ({ id: item.id, label: item.label, unit: item.unit, value: item.value }))
      : [blankStatic()],
  );

  function updateCurrency(id: string, patch: Partial<CurrencyDraft>) {
    setCurrencies((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function updateStatic(id: string, patch: Partial<StaticDraft>) {
    setStatics((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function saveCurrencies() {
    start(async () => {
      const res = await saveCurrencyPrices({ currencies });
      if (redirectIfUnauthorized(res)) return;
      if (!res.ok) {
        toast.error(res.message || 'ذخیره نشد');
        return;
      }
      toast.success(res.message || 'ذخیره شد');
      router.refresh();
    });
  }

  function pullCurrency(row: CurrencyDraft) {
    start(async () => {
      const saved = await saveCurrencyPrices({ currencies });
      if (redirectIfUnauthorized(saved)) return;
      if (!saved.ok) {
        toast.error(saved.message || 'ذخیره نشد');
        return;
      }
      const res = await refreshCurrencyNow({ id: row.id, url: row.url, path: row.path });
      if (redirectIfUnauthorized(res)) return;
      if (!res.ok) {
        toast.error(res.message || 'قیمت خوانده نشد');
        return;
      }
      toast.success(res.message || 'قیمت خوانده شد');
      router.refresh();
    });
  }

  function saveStatics() {
    start(async () => {
      const res = await saveStaticPrices({ statics });
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
    <div className="space-y-4" dir="rtl">
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <SectionHeader title="قیمت ارز" onAdd={() => setCurrencies((current) => [...current, blankCurrency()])} />
        <p className="mt-1 text-sm leading-7 text-gray-500">
          هر ارز یک آدرس API، مسیر عدد در پاسخ، و زمان تکرار دارد. اگر پاسخ {'{ "price": 90000 }'} باشد، مسیر را price
          بگذارید. خواندن API در پس‌زمینه انجام می‌شود و همه کاربران همان قیمت ذخیره‌شده را می‌بینند.
        </p>
        <div className="mt-4 space-y-3">
          {currencies.map((row, index) => {
            const saved = prices.currencies.find((item) => item.id === row.id);
            return (
              <div key={row.id} className="space-y-3 rounded-xl border border-gray-200 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-gray-700">ارز {faNumber(index + 1)}</p>
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    disabled={pending}
                    onClick={() => setCurrencies((current) => current.filter((item) => item.id !== row.id))}
                  >
                    حذف
                  </Button>
                </div>
                <Input label="نام" value={row.label} onChange={(event) => updateCurrency(row.id, { label: event.target.value })} />
                <Input
                  label="آدرس API"
                  dir="ltr"
                  placeholder="https://example.com/usd"
                  value={row.url}
                  onChange={(event) => updateCurrency(row.id, { url: event.target.value })}
                />
                <Input
                  label="مسیر مقدار در پاسخ"
                  dir="ltr"
                  placeholder="price یا data.usd"
                  hint="خالی بگذارید اگر خود پاسخ فقط یک عدد است"
                  value={row.path}
                  onChange={(event) => updateCurrency(row.id, { path: event.target.value })}
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input label="واحد" value={row.unit} onChange={(event) => updateCurrency(row.id, { unit: event.target.value })} />
                  <Input
                    label="تکرار (ثانیه)"
                    dir="ltr"
                    inputMode="numeric"
                    hint={`حداقل ${faNumber(MIN_PRICE_INTERVAL_SECONDS)} ثانیه`}
                    value={String(row.intervalSeconds || '')}
                    onChange={(event) => updateCurrency(row.id, { intervalSeconds: Number(event.target.value.replace(/\D/g, '')) || 0 })}
                  />
                </div>
                <p className="text-sm text-gray-700">
                  قیمت فعلی:{' '}
                  <span className="font-semibold">
                    {saved?.value == null ? 'هنوز خوانده نشده' : `${faNumber(saved.value)} ${saved.unit}`}
                  </span>
                  {saved && when(saved.updatedAt) ? <span className="text-gray-500"> — {when(saved.updatedAt)}</span> : null}
                </p>
                {saved?.error ? <p className="text-sm text-rose-600">{saved.error}</p> : null}
                <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => pullCurrency(row)}>
                  دریافت الان
                </Button>
              </div>
            );
          })}
        </div>
        <div className="mt-4">
          <Button disabled={pending} onClick={saveCurrencies}>
            {pending ? 'در حال ذخیره...' : 'ذخیره قیمت‌های ارزی'}
          </Button>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <SectionHeader title="قیمت ثابت" onAdd={() => setStatics((current) => [...current, blankStatic()])} />
        <p className="mt-1 text-sm leading-7 text-gray-500">
          این قیمت‌ها را خودتان می‌نویسید و هر وقت خواستید عوض می‌کنید. مثلاً قیمت هر پارچه.
        </p>
        <div className="mt-4 space-y-3">
          {statics.map((row, index) => (
            <div key={row.id} className="space-y-3 rounded-xl border border-gray-200 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-gray-700">قیمت {faNumber(index + 1)}</p>
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  disabled={pending}
                  onClick={() => setStatics((current) => current.filter((item) => item.id !== row.id))}
                >
                  حذف
                </Button>
              </div>
              <Input label="نام" value={row.label} onChange={(event) => updateStatic(row.id, { label: event.target.value })} />
              <PriceField label="قیمت" value={row.value || ''} onChange={(value) => updateStatic(row.id, { value })} />
              <Input
                label="واحد"
                hint="مثلاً تومان یا تومان / متر"
                value={row.unit}
                onChange={(event) => updateStatic(row.id, { unit: event.target.value })}
              />
            </div>
          ))}
        </div>
        <div className="mt-4">
          <Button disabled={pending} onClick={saveStatics}>
            {pending ? 'در حال ذخیره...' : 'ذخیره قیمت‌های ثابت'}
          </Button>
        </div>
      </section>
    </div>
  );
}
