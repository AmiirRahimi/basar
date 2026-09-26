'use client';

import { checkoutWholesale } from '@/actions/shop';
import { useShopCart } from './CartProvider';
import { ShopButton } from './ShopUi';
import { Input, Textarea } from '@/ui';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

export function CheckoutForm({
  storefront = false,
  initial,
}: {
  storefront?: boolean;
  initial?: { fullName: string; phone: string; address: string };
}) {
  const [fullName, setFullName] = useState(initial?.fullName || '');
  const [phone, setPhone] = useState(initial?.phone || '');
  const [address, setAddress] = useState(initial?.address || '');
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
          if (res.ok && res.redirectUrl) {
            window.location.href = res.redirectUrl;
            return;
          }
          if (res.ok && res.invoices.length) {
            const ids = res.invoices.map((invoice) => invoice.id).join(',');
            router.push(`/order/success?ids=${encodeURIComponent(ids)}${storefront ? '&paid=1' : ''}`);
          }
        });
      }}
    >
      <p className="text-[11px] tracking-[0.22em] text-shop-ink/45">دفتر سفارش عمده</p>
      {!initial ? (
        <p className="text-sm leading-7 text-shop-ink/65">
          <a href="/login?next=/checkout" className="text-shop-ink underline decoration-shop-saffron underline-offset-4">
            ورود با موبایل
          </a>{' '}
          آدرس و سفارش‌های قبلی را نگه می‌دارد. اگر در شمارش حساب دارید، همان شماره کافی است.
        </p>
      ) : null}
      <Input label="نام فروشگاه / خریدار" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
      <Input label="موبایل" dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} required placeholder="09xxxxxxxxx" />
      <Textarea label="آدرس تحویل" rows={3} value={address} onChange={(e) => setAddress(e.target.value)} required />
      <p className="text-sm text-shop-ink/60">
        {storefront
          ? 'پس از ثبت مشخصات به درگاه پرداخت می‌روید. سفارش عمده برای همین فروشنده ثبت می‌شود.'
          : 'سفارش عمده ثبت می‌شود. پرداخت و چک را بعد از هماهنگی با حجره وارد می‌کنید.'}
      </p>
      {message ? <p className="text-sm text-shop-madder">{message}</p> : null}
      <ShopButton type="submit" disabled={pending || totals.packs < 1} className="w-full">
        {pending ? 'در حال ثبت...' : storefront ? 'پرداخت از درگاه' : 'ثبت سفارش بسته‌ها'}
      </ShopButton>
    </form>
  );
}
