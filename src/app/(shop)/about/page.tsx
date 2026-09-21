import type { Metadata } from 'next';
import { BRAND, BRAND_ADDRESSES } from '@/lib/brand';
import { faNumber } from '@/lib/format';
import { ShopButton } from '@/components/shop/ShopUi';
import { pageShare } from '@/lib/share-meta';
import { absoluteUrl } from '@/lib/site';

export const metadata: Metadata = pageShare({
  title: 'درباره جین پوش | عمده‌فروشی پوشاک بازار بزرگ',
  description: 'جین پوش حجره خانواده رحیمی در بازار آهنگران است. فروش عمده شلوار جین و پوشاک با بسته.',
  url: absoluteUrl('/about'),
});

const STORY = 'https://images.unsplash.com/photo-1565084888279-aca607ecce0c?auto=format&fit=crop&w=1600&q=80';

export default function AboutPage() {
  return (
    <div>
      <section data-shop-dark className="relative overflow-hidden bg-shop-ink text-shop-bone">
        <div className="absolute inset-0 bg-cover bg-center opacity-25" style={{ backgroundImage: `url(${STORY})` }} />
        <div className="absolute inset-0 bg-gradient-to-l from-shop-ink via-shop-ink/88 to-shop-ink/70" />
        <div className="relative mx-auto max-w-4xl px-4 py-14 sm:py-20 lg:px-6 lg:py-28">
          <p className="text-[11px] tracking-[0.28em] text-shop-saffron">{BRAND.latin}</p>
          <h1 className="mt-3 text-3xl font-semibold text-shop-bone sm:text-4xl md:text-6xl">{BRAND.name}</h1>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-shop-bone/75">
            برند پوشاک {BRAND.family} با بیش از {faNumber(BRAND.years)} سال فعالیت در بازار بزرگ تهران.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-3xl px-4 py-10 sm:py-16 lg:px-6">
        <p className="leading-8 text-shop-ink/75">
          جین پوش کار چند نسل از خانواده رحیمی است. از حجره‌های بازار آهنگران در خیابان ۱۵ خرداد، جین، کتان و پیراهن را برای فروشگاه‌ها،
          مزون‌ها و پخش‌کننده‌ها آماده می‌کنیم. خریداران عمده هنوز برای دیدن رنگ، پارچه و موجودی به همین دو پلاک در کوچه کلانتری می‌آیند.
        </p>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl bg-shop-paper px-5 py-6">
            <p className="text-shop-saffron">بیش از {faNumber(BRAND.years)} سال</p>
            <p className="mt-2 text-sm leading-7 text-shop-ink/70">فعالیت پیوسته در بازار بزرگ؛ شناخت مدل، سایز و سلیقه فروشگاه‌های پوشاک.</p>
          </div>
          <div className="rounded-2xl bg-shop-paper px-5 py-6">
            <p className="text-shop-saffron">{BRAND.family}</p>
            <p className="mt-2 text-sm leading-7 text-shop-ink/70">برند خانوادگی با حجره در بازار آهنگران، خیابان ۱۵ خرداد.</p>
          </div>
        </div>

        <ul className="mt-8 space-y-4 text-shop-ink/75">
          <li className="rounded-2xl bg-shop-paper px-5 py-4">فروش عمده است؛ واحد سفارش بسته است نه عدد تکی مصرف‌کننده.</li>
          <li className="rounded-2xl bg-shop-paper px-5 py-4">بسته کامل در اولویت است. بسته‌های ناقص جدا انتخاب می‌شوند.</li>
          <li className="rounded-2xl bg-shop-paper px-5 py-4">فاکتور روی موجودی حجره ثبت می‌شود و کارکنان در پنل شمارش آن را می‌بینند.</li>
          {BRAND_ADDRESSES.map((address) => (
            <li key={address.title} className="rounded-2xl bg-shop-paper px-5 py-4">
              {address.title}: {address.line}
            </li>
          ))}
        </ul>

        <div className="mt-10 flex flex-wrap gap-3">
          <ShopButton href="/catalog">دیدن محصولات</ShopButton>
          <ShopButton href="/contact" variant="outline">
            تماس با ما
          </ShopButton>
        </div>
      </div>
    </div>
  );
}
