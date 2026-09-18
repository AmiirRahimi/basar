import { BRAND, BRAND_ADDRESSES, BRAND_PHONES } from '@/lib/brand';
import { ShopButton } from '@/components/shop/ShopUi';
import { MapPin, Phone } from 'lucide-react';

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:py-16 lg:px-6">
      <p className="text-[11px] tracking-[0.28em] text-shop-saffron">{BRAND.name}</p>
      <h1 className="mt-2 text-3xl font-semibold text-shop-ink sm:text-4xl">تماس با ما</h1>
      <p className="mt-4 max-w-2xl leading-8 text-shop-ink/70">
        برای هماهنگی بارگیری، موجودی یا بازدید از حجره با {BRAND.family} تماس بگیرید. سفارش عمده بسته‌ای را می‌توانید از کاتالوگ هم ثبت کنید.
      </p>

      <section className="mt-10">
        <h2 className="flex items-center gap-2 text-xl font-medium text-shop-ink">
          <Phone className="h-5 w-5 text-shop-saffron" />
          تلفن
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {BRAND_PHONES.map((phone) => (
            <a
              key={phone.href}
              href={phone.href}
              dir="ltr"
              className="rounded-2xl border border-shop-ink/10 bg-shop-paper px-5 py-6 text-lg tracking-wide text-shop-ink hover:border-shop-saffron/50"
            >
              {phone.display}
            </a>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="flex items-center gap-2 text-xl font-medium text-shop-ink">
          <MapPin className="h-5 w-5 text-shop-saffron" />
          آدرس حجره‌ها
        </h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {BRAND_ADDRESSES.map((address) => (
            <div key={address.title} className="rounded-2xl border border-shop-ink/10 bg-shop-paper px-5 py-6">
              <p className="text-shop-saffron">{address.title}</p>
              <p className="mt-2 leading-8">{address.line}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-10 flex flex-wrap gap-3">
        <ShopButton href="/catalog">سفارش از کاتالوگ</ShopButton>
        <ShopButton href="/about" variant="outline">
          درباره جین پوش
        </ShopButton>
      </div>
    </div>
  );
}
