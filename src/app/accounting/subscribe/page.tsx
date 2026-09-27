import { BrandLogo } from '@/components/brand/BrandLogo';
import { SubscriptionPanel } from '@/components/accounting/SubscriptionPanel';

const POINTS = [
  'ثبت پارچه، خیاط، شست‌وشو و چاپ برای هر لباس',
  'فاکتور عمده و بیجک، با چاپ',
  'چند فروشگاه و چند برند در یک حساب',
  'لینک مشتری و پیگیری فروش',
];

export default function SubscribePage() {
  return (
    <div className="min-h-screen bg-zinc-100 px-4 py-8 sm:px-6" dir="rtl">
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <header className="flex flex-col gap-4">
          <BrandLogo variant="full" className="h-10 w-auto self-start" />
          <div>
            <p className="text-sm text-shop-saffron">نرم‌افزار حسابداری</p>
            <h1 className="mt-1 text-2xl font-semibold text-zinc-900 sm:text-3xl">باسار برای عمده‌فروشی پوشاک</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-600 sm:text-base">
              باسار کار حجره را در یک جا نگه می‌دارد: موجودی لباس، فاکتور، بیجک، فروشگاه و برند. برای شروع، یکی از طرح‌ها را
              انتخاب کنید. تا وقتی اشتراکی نخریده باشید، منوی حسابداری نشان داده نمی‌شود.
            </p>
          </div>
          <ul className="grid gap-2 sm:grid-cols-2">
            {POINTS.map((point) => (
              <li key={point} className="rounded-2xl bg-white px-4 py-3 text-sm text-zinc-700">
                {point}
              </li>
            ))}
          </ul>
        </header>
        <SubscriptionPanel successPath="/accounting/dashboard" />
      </div>
    </div>
  );
}
