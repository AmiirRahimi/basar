import { ShopFooter, ShopHeader } from '@/components/shop/ShopChrome';

export default function AboutPage() {
  return (
    <div dir="rtl">
      <ShopHeader />
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-16">
        <h1 className="text-3xl font-semibold">شرایط فروش عمده</h1>
        <p className="text-muted-foreground">
          بازار یک بنکداری پوشاک است. سفارش‌ها برای فروشگاه‌ها، مزون‌ها و پخش‌کننده‌هاست، نه خرید تکی مصرف‌کننده.
        </p>
        <ul className="list-disc space-y-2 pr-5 text-muted-foreground">
          <li>هر مدل حداقل سفارش (MOQ) دارد.</li>
          <li>فاکتور از همان ماژول شمارش کارکنان صادر می‌شود.</li>
          <li>پرداخت و چک در پنل شمارش ثبت می‌شود.</li>
          <li>برای افتتاح حساب خریدار با شماره موبایل وارد پنل شوید.</li>
        </ul>
      </div>
      <ShopFooter />
    </div>
  );
}
