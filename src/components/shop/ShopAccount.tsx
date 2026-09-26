'use client';

import { acceptCountingAddress, logoutShop, saveShopProfile } from '@/actions/shop-account';
import { faDate, faNumber, toman } from '@/lib/format';
import type { ShopAccountView } from '@/lib/shop-account';
import { toast } from '@/ui';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { shopInputClass, ShopButton } from './ShopUi';

function toEnDigits(value: string) {
  return value.replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit))).replace(/\s/g, '');
}

function statusLabel(order: ShopAccountView['orders'][number]) {
  if (order.sent) return 'ارسال شده';
  if (order.paid) return 'پرداخت شده';
  return 'ثبت شده';
}

export function ShopAccount({ account }: { account: ShopAccountView }) {
  const router = useRouter();
  const [fullName, setFullName] = useState(account.fullName);
  const [email, setEmail] = useState(account.email);
  const [city, setCity] = useState(account.shopCity);
  const [address, setAddress] = useState(account.shopAddress);
  const [postalCode, setPostalCode] = useState(account.postalCode);
  const [landlines, setLandlines] = useState(account.landlines.length ? account.landlines : ['']);
  const [hiddenOffers, setHiddenOffers] = useState<string[]>([]);
  const [pending, start] = useTransition();
  const savedKey = [
    account.fullName,
    account.email,
    account.shopCity,
    account.shopAddress,
    account.postalCode,
    account.landlines.join('\n'),
  ].join('|');

  useEffect(() => {
    setFullName(account.fullName);
    setEmail(account.email);
    setCity(account.shopCity);
    setAddress(account.shopAddress);
    setPostalCode(account.postalCode);
    setLandlines(account.landlines.length ? account.landlines : ['']);
    // savedKey already includes every saved field, including landlines.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedKey]);

  const offers = account.countingAddresses.filter((offer) => !hiddenOffers.includes(offer.id) && offer.address !== address.trim());
  const missing = [
    !fullName.trim() ? 'نام' : '',
    !address.trim() ? 'آدرس تحویل' : '',
    !city.trim() ? 'شهر' : '',
    !postalCode.trim() ? 'کد پستی' : '',
  ].filter(Boolean);

  function updateLine(index: number, value: string) {
    setLandlines((current) => current.map((line, i) => (i === index ? toEnDigits(value).slice(0, 11) : line)));
  }

  function save() {
    start(async () => {
      const res = await saveShopProfile({
        fullName,
        email,
        city,
        address,
        postalCode: toEnDigits(postalCode),
        landlines: landlines.map((line) => toEnDigits(line)).filter(Boolean),
      });
      if (!res.ok) {
        toast.error(res.message || 'ذخیره نشد');
        return;
      }
      toast.success(res.message || 'ذخیره شد');
      router.refresh();
    });
  }

  function useCountingAddress(id: string) {
    start(async () => {
      const res = await acceptCountingAddress(id);
      if (!res.ok) {
        toast.error(res.message || 'آدرس اضافه نشد');
        return;
      }
      toast.success(res.message || 'آدرس اضافه شد');
      router.refresh();
    });
  }

  function logout() {
    start(async () => {
      const res = await logoutShop();
      if (!res.ok) {
        toast.error(res.message || 'خروج انجام نشد');
        return;
      }
      router.push('/');
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 lg:px-6 lg:py-14" dir="rtl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] tracking-[0.28em] text-shop-saffron">حساب خریدار</p>
          <h1 className="mt-2 text-4xl font-semibold text-shop-ink">{fullName.trim() || 'تکمیل حساب'}</h1>
          <p className="mt-2 text-sm text-shop-ink/60" dir="ltr">
            {account.phonenumber}
          </p>
        </div>
        <ShopButton variant="outline" disabled={pending} onClick={logout}>
          خروج
        </ShopButton>
      </div>

      {account.viaCounting ? (
        <p className="mt-4 text-sm text-shop-ink/60">با همین شماره در شمارش هم وارد هستید. آدرس تحویل فروشگاه جدا ذخیره می‌شود.</p>
      ) : null}

      {missing.length ? (
        <p className="mt-6 rounded-2xl border border-shop-saffron/30 bg-shop-saffron/10 px-4 py-3 text-sm text-shop-ink">
          برای تحویل سفارش این‌ها را کامل کنید: {missing.join('، ')}
        </p>
      ) : (
        <p className="mt-6 rounded-2xl border border-shop-ink/10 bg-white px-4 py-3 text-sm text-shop-ink/70">
          اطلاعات تحویل کامل است.
        </p>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)]">
        <section className="space-y-4">
          {offers.map((offer) => (
            <article key={offer.id} className="rounded-[1.6rem] border border-shop-saffron/40 bg-shop-paper p-5">
              <p className="text-sm font-medium text-shop-ink">{offer.label}</p>
              <p className="mt-2 text-sm leading-7 text-shop-ink/75">{offer.address}</p>
              {offer.city ? <p className="mt-1 text-xs text-shop-ink/50">{offer.city}</p> : null}
              {offer.landlines.length ? (
                <p className="mt-1 text-xs text-shop-ink/50" dir="ltr">
                  {offer.landlines.join(' · ')}
                </p>
              ) : null}
              <p className="mt-3 text-sm text-shop-ink/65">اگر می‌خواهید، همین را آدرس تحویل سفارش‌ها کنید.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <ShopButton disabled={pending} onClick={() => useCountingAddress(offer.id)}>
                  بله، استفاده شود
                </ShopButton>
                <ShopButton variant="outline" disabled={pending} onClick={() => setHiddenOffers((current) => [...current, offer.id])}>
                  نه، خودم می‌نویسم
                </ShopButton>
              </div>
            </article>
          ))}

          <form
            className="space-y-4 rounded-[1.6rem] border border-shop-ink/10 bg-white p-5 sm:p-6"
            onSubmit={(event) => {
              event.preventDefault();
              save();
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-1.5">
                <span className="text-xs tracking-[0.16em] text-shop-ink/50">نام و نام خانوادگی</span>
                <input className={shopInputClass} value={fullName} onChange={(event) => setFullName(event.target.value)} autoComplete="name" />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs tracking-[0.16em] text-shop-ink/50">موبایل</span>
                <input className={shopInputClass} dir="ltr" value={account.phonenumber} disabled />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs tracking-[0.16em] text-shop-ink/50">شهر</span>
                <input className={shopInputClass} value={city} onChange={(event) => setCity(event.target.value)} autoComplete="address-level2" />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs tracking-[0.16em] text-shop-ink/50">ایمیل</span>
                <input className={shopInputClass} dir="ltr" inputMode="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" />
              </label>
            </div>
            <label className="block space-y-1.5">
              <span className="text-xs tracking-[0.16em] text-shop-ink/50">آدرس تحویل</span>
              <textarea className={shopInputClass} rows={3} value={address} onChange={(event) => setAddress(event.target.value)} autoComplete="street-address" />
            </label>
            <label className="block max-w-xs space-y-1.5">
              <span className="text-xs tracking-[0.16em] text-shop-ink/50">کد پستی</span>
              <input
                className={shopInputClass}
                dir="ltr"
                inputMode="numeric"
                autoComplete="postal-code"
                placeholder="۱۰ رقم"
                value={postalCode}
                onChange={(event) => setPostalCode(toEnDigits(event.target.value).replace(/\D/g, '').slice(0, 10))}
              />
            </label>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs tracking-[0.16em] text-shop-ink/50">تلفن ثابت</span>
                <button
                  type="button"
                  className="text-xs text-shop-ink/70 hover:text-shop-ink"
                  onClick={() => setLandlines((current) => (current.length >= 6 ? current : [...current, '']))}
                >
                  افزودن شماره
                </button>
              </div>
              {landlines.map((line, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    className={shopInputClass}
                    dir="ltr"
                    inputMode="tel"
                    placeholder="021xxxxxxxx"
                    value={line}
                    onChange={(event) => updateLine(index, event.target.value)}
                  />
                  {landlines.length > 1 ? (
                    <button
                      type="button"
                      className="shrink-0 rounded-full px-3 text-xs text-shop-madder"
                      onClick={() => setLandlines((current) => current.filter((_, i) => i !== index))}
                    >
                      حذف
                    </button>
                  ) : null}
                </div>
              ))}
              <p className="text-xs text-shop-ink/45">هر چند شماره ثابت که لازم است اضافه کنید.</p>
            </div>
            <ShopButton type="submit" disabled={pending}>
              {pending ? 'در حال ذخیره...' : 'ذخیره اطلاعات'}
            </ShopButton>
          </form>
        </section>

        <aside className="space-y-4">
          <div className="rounded-[1.6rem] border border-shop-ink/10 bg-shop-ink px-5 py-6 text-shop-bone">
            <p className="text-[11px] tracking-[0.22em] text-shop-saffron">سفارش‌های قبلی</p>
            <p className="mt-2 text-3xl font-semibold">{faNumber(account.orders.length)}</p>
            <p className="mt-1 text-sm text-shop-bone/65">سفارش ثبت‌شده با این شماره در وب‌سایت</p>
            <ShopButton href="/catalog" variant="outlineDark" className="mt-5">
              ادامه خرید
            </ShopButton>
          </div>
          {account.orders.length ? (
            <ul className="space-y-3">
              {account.orders.map((order) => (
                <li key={order.id} className="rounded-[1.4rem] border border-shop-ink/10 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-shop-ink">فاکتور {faNumber(order.invoiceNumber)}</p>
                      <p className="mt-1 text-xs text-shop-ink/50">{order.date ? faDate(order.date) : '—'}</p>
                    </div>
                    <span className="rounded-full bg-shop-ink/5 px-2.5 py-1 text-[11px] text-shop-ink/70">{statusLabel(order)}</span>
                  </div>
                  <ul className="mt-3 space-y-1 text-sm text-shop-ink/75">
                    {order.lines.map((line, index) => (
                      <li key={`${order.id}-${index}`}>
                        {line.name}
                        {line.packsLabel ? ` · ${line.packsLabel}` : ''}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-sm font-medium text-shop-ink">{toman(order.total)}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-[1.4rem] border border-dashed border-shop-ink/15 px-4 py-8 text-center text-sm text-shop-ink/55">
              هنوز سفارشی با این شماره در وب‌سایت ثبت نشده است.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
