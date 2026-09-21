import { ShopButton } from '@/components/shop/ShopUi';

export default async function OrderFailedPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const { message } = await searchParams;
  return (
    <div className="mx-auto max-w-xl px-4 py-16 lg:px-6" dir="rtl">
      <p className="text-[11px] tracking-[0.28em] text-shop-madder">پرداخت نشد</p>
      <h1 className="mt-2 text-3xl font-semibold">پرداخت کامل نشد</h1>
      <p className="mt-3 text-shop-ink/65">{message || 'پرداخت لغو شد یا درگاه آن را تایید نکرد. سبد شما مانده است.'}</p>
      <div className="mt-8 flex gap-3">
        <ShopButton href="/checkout">بازگشت به تسویه</ShopButton>
        <ShopButton href="/cart" variant="outline">
          سبد خرید
        </ShopButton>
      </div>
    </div>
  );
}
