import { ShopButton } from '@/components/shop/ShopUi';

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 lg:px-6">
      <p className="text-[11px] tracking-[0.28em] text-shop-ink/40">انبار</p>
      <h1 className="mt-2 text-4xl font-semibold">ارتباط با بازار</h1>
      <p className="mt-4 leading-8 text-shop-ink/70">
        برای هماهنگی بارگیری، افتتاح حساب خریدار یا موجودی خاص با انبار تماس بگیرید. ثبت سفارش بسته‌ای از همین سایت ممکن است.
      </p>
      <div className="mt-8 grid gap-4">
        <div className="rounded-[1.6rem] bg-shop-paper px-5 py-6">
          <p className="text-xs text-shop-ink/45">سفارش عمده</p>
          <p className="mt-1 text-lg">از کاتالوگ بسته انتخاب کنید و فاکتور بگیرید.</p>
        </div>
        <div className="rounded-[1.6rem] bg-shop-paper px-5 py-6">
          <p className="text-xs text-shop-ink/45">کارکنان</p>
          <p className="mt-1 text-lg">ورود به شمارش برای فاکتور، چک و موجودی.</p>
        </div>
      </div>
      <div className="mt-8 flex flex-wrap gap-3">
        <ShopButton href="/catalog">ایندکس کالا</ShopButton>
        <ShopButton href="/counting/login" variant="outline">
          پنل شمارش
        </ShopButton>
      </div>
    </div>
  );
}
