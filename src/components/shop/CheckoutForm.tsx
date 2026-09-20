'use client';

import { checkoutWholesale } from '@/actions/shop';
import { useShopCart } from './CartProvider';
import { shopInputClass, ShopButton, ShopField } from './ShopUi';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

export function CheckoutForm({ storefront = false }: { storefront?: boolean }) {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [message, setMessage] = useState('');
  const [pending, start] = useTransition();
  const router = useRouter();
  const { totals } = useShopCart();

  return (
    <form
      className="space-y-4 rounded-[1.6rem] border border-shop-ink/10 bg-shop-paper p-6"
      onSubmit={(event) => {
        event.preventDefault();
        start(async () => {
          const res = await checkoutWholesale({ fullName, phone, address });
          setMessage(res.message);
          if (res.ok && res.invoices.length) {
            const ids = res.invoices.map((invoice) => invoice.id).join(',');
            router.push(`/order/success?ids=${encodeURIComponent(ids)}`);
          }
        });
      }}
    >
      <p className="text-[11px] tracking-[0.22em] text-shop-ink/45">دفتر سفارش عمده</p>
      <ShopField label="نام فروشگاه / خریدار">
        <input className={shopInputClass} value={fullName} onChange={(e) => setFullName(e.target.value)} required />
      </ShopField>
      <ShopField label="موبایل">
        <input className={shopInputClass} dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} required placeholder="09xxxxxxxxx" />
      </ShopField>
      <ShopField label="آدرس تحویل">
        <textarea className={shopInputClass} rows={3} value={address} onChange={(e) => setAddress(e.target.value)} required />
      </ShopField>
      <p className="text-sm text-shop-ink/60">
        {storefront
          ? 'پرداخت از درگاه باسار انجام می‌شود و سفارش برای فروشندهٔ لینک در پنل ثبت می‌گردد.'
          : 'فاکتور در شمارش ثبت می‌شود. پرداخت و چک را کارکنان بعد از هماهنگی وارد می‌کنند.'}
      </p>
      {message ? <p className="text-sm text-shop-madder">{message}</p> : null}
      <ShopButton type="submit" disabled={pending || totals.packs < 1} className="w-full">
        {pending ? 'در حال ثبت...' : storefront ? 'پرداخت و ثبت سفارش' : 'ثبت سفارش بسته‌ها'}
      </ShopButton>
    </form>
  );
}
