import { CheckoutForm } from '@/components/shop/CheckoutForm';
import { CartLines } from '@/components/shop/CartLines';
import { cookies } from 'next/headers';
import { SHARE_TOKEN_COOKIE } from '@/lib/constants';

export default async function CheckoutPage() {
  const storefront = Boolean((await cookies()).get(SHARE_TOKEN_COOKIE)?.value);
  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 lg:grid-cols-[1fr_22rem] lg:px-6">
      <div>
        <p className="text-[11px] tracking-[0.28em] text-shop-ink/40">تسویه</p>
        <h1 className="mt-2 mb-6 text-4xl font-semibold">
          {storefront ? 'پرداخت سفارش ویترین' : 'ثبت سفارش بسته‌ها'}
        </h1>
        <CartLines compact />
      </div>
      <CheckoutForm storefront={storefront} />
    </div>
  );
}
