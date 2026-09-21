import { JsonLd } from '@/components/seo/JsonLd';
import { BRAND, BRAND_ADDRESSES, BRAND_PHONES, colorSwatch } from '@/lib/brand';
import { collectionsForSeo, colorsFromCatalog, newFromCatalog, saleFromCatalog } from '@/lib/catalog';
import { collectionPath } from '@/lib/collection-slug';
import { faNumber } from '@/lib/format';
import { shopOrganizationLd } from '@/lib/json-ld';
import type { CatalogProduct } from '@/lib/types';
import Link from 'next/link';
import { ProductGrid, ProductRail } from './ProductRail';
import { ShopButton } from './ShopUi';

const HERO = 'https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=2000&q=80';
const STORY = 'https://images.unsplash.com/photo-1604176354204-9268737828e4?auto=format&fit=crop&w=1600&q=80';

function SectionHead({
  eyebrow,
  title,
  href,
  linkLabel,
}: {
  eyebrow: string;
  title: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="mb-6 flex items-end justify-between gap-3 sm:mb-8 sm:gap-4">
      <div className="min-w-0">
        <p className="text-[11px] tracking-[0.28em] text-shop-saffron">{eyebrow}</p>
        <h2 className="mt-1 text-2xl font-semibold text-shop-ink sm:text-3xl md:text-4xl">{title}</h2>
      </div>
      {href ? (
        <Link href={href} className="shrink-0 text-xs text-shop-ink/55 hover:text-shop-ink sm:text-sm">
          {linkLabel || 'همه'}
        </Link>
      ) : null}
    </div>
  );
}

export function HomeLanding({
  products,
  kinds = [],
}: {
  products: CatalogProduct[];
  kinds?: { id: string; name: string }[];
}) {
  const newest = newFromCatalog(products);
  const sale = saleFromCatalog(products);
  const collections = collectionsForSeo(products, kinds);
  const colors = colorsFromCatalog(products);
  const ready = products.slice(0, 12);

  return (
    <div>
      <JsonLd data={shopOrganizationLd()} />
      <section data-shop-hero data-shop-dark className="relative isolate min-h-[100dvh] w-full overflow-hidden bg-shop-ink text-shop-bone">
        <div className="absolute inset-0 animate-shop-kenburns bg-cover bg-center opacity-40" style={{ backgroundImage: `url(${HERO})` }} />
        <div className="shop-grain absolute inset-0 bg-gradient-to-l from-shop-ink via-shop-ink/90 to-shop-ink/70" />
        <div className="relative mx-auto flex min-h-[100dvh] max-w-7xl flex-col justify-end gap-5 px-4 py-12 sm:gap-8 sm:py-16 lg:px-6 lg:py-24">
          <p className="max-w-[18rem] text-[10px] tracking-[0.18em] text-shop-saffron sm:max-w-none sm:text-xs sm:tracking-[0.38em]">{BRAND.tagline}</p>
          <h1 className="max-w-4xl text-[2.15rem] font-semibold leading-[1.15] text-shop-bone sm:text-5xl md:text-7xl">
            پوشاک جین عمده
            <span className="mt-2 block text-shop-saffron">از بازار بزرگ تهران</span>
          </h1>
          <p className="max-w-xl text-base leading-7 text-shop-bone/75 sm:text-lg sm:leading-8">
            جین پوش حجره خانواده رحیمی است. شلوار جین، کتان و پوشاک دیگر را عمده، با بسته، از بازار آهنگران می‌فرستیم — نه عدد تکی.
          </p>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            <ShopButton href="/catalog" className="px-5 py-2.5 text-sm sm:px-7 sm:py-3 sm:text-base">
              همه محصولات
            </ShopButton>
            <ShopButton href="#sale" variant="outlineDark" className="px-5 py-2.5 text-sm sm:px-5 sm:py-2.5 sm:text-sm">
              محصولات تخفیف‌دار
            </ShopButton>
            <ShopButton href="#new" variant="ghostDark" className="px-5 py-2.5 text-sm">
              کالکشن جدید
            </ShopButton>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 lg:px-6">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-shop-ink/10 lg:grid-cols-4">
          {[
            [faNumber(BRAND.years), 'سال فعالیت در بازار بزرگ'],
            [BRAND.family, 'برند پوشاک رحیمی'],
            ['بازار آهنگران', 'خیابان ۱۵ خرداد، دو حجره'],
            ['فروش عمده', 'سفارش با بسته، نه عدد تکی'],
          ].map(([title, copy]) => (
            <div key={copy} className="bg-shop-paper px-4 py-6 sm:px-6 sm:py-8">
              <p className="text-lg font-medium text-shop-saffron sm:text-xl">{title}</p>
              <p className="mt-2 text-sm leading-7 text-shop-ink/70">{copy}</p>
            </div>
          ))}
        </div>
      </section>

      {newest.length ? (
        <section id="new" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-12 lg:px-6">
          <SectionHead eyebrow="تازه‌ها" title="کالکشن جدید" href="/catalog?new=1" linkLabel="همه مدل‌های جدید" />
          <ProductRail products={newest} featured />
        </section>
      ) : null}

      <section data-shop-dark className="bg-shop-ink text-shop-bone">
        <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-14 sm:gap-10 sm:py-20 lg:grid-cols-2 lg:px-6">
          <div
            className="h-52 overflow-hidden rounded-2xl bg-cover bg-center sm:h-80 md:h-[28rem]"
            style={{ backgroundImage: `url(${STORY})` }}
          />
          <div>
            <p className="text-[11px] tracking-[0.28em] text-shop-saffron">از بازار آهنگران</p>
            <h2 className="mt-3 text-2xl font-semibold leading-snug text-shop-bone sm:text-3xl md:text-5xl">جین پوش، کار خانواده رحیمی</h2>
            <p className="mt-5 max-w-xl text-base leading-8 text-shop-bone/75">
              بیش از چهار دهه در بازار بزرگ تهران جین، کتان و پیراهن را برای فروشگاه‌ها و پخش‌کننده‌ها آماده کرده‌ایم. حجره‌های ما در کوچه
              کلانتری هنوز همان جایی است که خریداران عمده برای دیدن پارچه، رنگ و موجودی می‌آیند.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ShopButton href="/about">داستان برند</ShopButton>
              <ShopButton href="/contact" variant="outlineDark">
                نشانی حجره‌ها
              </ShopButton>
            </div>
          </div>
        </div>
      </section>

      {sale.length ? (
        <section id="sale" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-16 lg:px-6">
          <SectionHead eyebrow="حراج" title="محصولات تخفیف‌دار" href="/catalog?sale=1" linkLabel="همه حراج‌ها" />
          <ProductRail products={sale} featured />
        </section>
      ) : null}

      {collections.length ? (
        <section className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
          <SectionHead eyebrow="دسته‌بندی" title="شلوار جین و بقیه انواع" href="/catalog" linkLabel="همه محصولات" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {collections.map((collection) => (
              <Link
                key={collection.id}
                href={collectionPath(collection.name, collection.id, collections)}
                data-shop-dark
                className="group relative h-44 overflow-hidden rounded-2xl sm:h-56 text-shop-bone"
              >
                <div
                  className="absolute inset-0 bg-cover bg-center transition duration-700 group-hover:scale-105"
                  style={{ backgroundImage: `url(${collection.image})` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-shop-ink via-shop-ink/75 to-shop-ink/35" />
                <div className="relative flex h-full flex-col justify-end p-6 text-shop-bone [text-shadow:0_1px_12px_rgb(16_28_48_/_0.85)]">
                  <p className="text-2xl font-medium text-shop-bone">{collection.name}</p>
                  <p className="text-sm text-shop-bone/80">{faNumber(collection.count)} مدل</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {colors.length ? (
        <section className="mx-auto max-w-7xl px-4 py-16 lg:px-6">
          <SectionHead eyebrow="رنگ‌ها" title="انتخاب بر اساس رنگ" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {colors.map((color) => (
              <Link
                key={color.id}
                href={`/catalog?color=${encodeURIComponent(color.id)}`}
                className="group overflow-hidden rounded-2xl border border-shop-ink/10 bg-shop-paper"
              >
                <div className="relative h-36 bg-cover bg-center" style={{ backgroundImage: `url(${color.image})` }}>
                  <div className="absolute inset-0 bg-shop-ink/25 transition group-hover:bg-shop-ink/10" />
                </div>
                <div className="flex items-center gap-3 px-4 py-4">
                  <span className="h-4 w-4 rounded-full border border-shop-ink/15" style={{ backgroundColor: colorSwatch(color.name) }} />
                  <div>
                    <p className="font-medium">{color.name}</p>
                    <p className="text-xs text-shop-ink/50">{faNumber(color.count)} مدل</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
          <SectionHead eyebrow="موجودی حجره" title="مدل‌های آماده ارسال" href="/catalog" linkLabel="همه محصولات" />
        {ready.length ? (
          <ProductGrid products={ready} />
        ) : (
          <p className="rounded-2xl border border-dashed border-shop-ink/15 px-6 py-16 text-center text-shop-ink/55">
            هنوز لباسی با موجودی در انبار نیست.
          </p>
        )}
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 lg:px-6">
        <SectionHead eyebrow="بازدید" title="دو حجره در بازار آهنگران" href="/contact" linkLabel="تماس و نشانی کامل" />
        <div className="grid gap-4 lg:grid-cols-2">
          {BRAND_ADDRESSES.map((address) => (
            <Link
              key={address.title}
              href="/contact"
              className="rounded-2xl border border-shop-ink/10 bg-shop-paper p-6 transition hover:border-shop-saffron/40"
            >
              <p className="text-shop-saffron">{address.title}</p>
              <p className="mt-2 text-base leading-8 sm:text-lg">{address.line}</p>
              <p className="mt-3 text-sm text-shop-ink/55">{address.floor}</p>
            </Link>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap gap-4 text-sm">
          {BRAND_PHONES.map((phone) => (
            <a key={phone.href} href={phone.href} dir="ltr" className="rounded-full bg-shop-ink px-4 py-2 text-shop-bone">
              {phone.display}
            </a>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-8 lg:px-6">
        <div data-shop-dark className="overflow-hidden rounded-2xl bg-shop-ink px-5 py-10 text-shop-bone sm:px-6 sm:py-14 md:px-12">
          <p className="text-[11px] tracking-[0.28em] text-shop-saffron">{BRAND.latin}</p>
          <h2 className="mt-3 max-w-2xl text-2xl font-semibold text-shop-bone sm:text-3xl md:text-5xl">موجودی عمده حجره را ببینید</h2>
          <p className="mt-4 max-w-xl leading-8 text-shop-bone/70">
            نوع لباس را از مجموعه‌ها باز کن — مثلاً شلوار جین عمده — یا همه مدل‌ها را یک‌جا ببین.
          </p>
          <ShopButton href="/catalog" className="mt-8">
            ورود به محصولات
          </ShopButton>
        </div>
      </section>
    </div>
  );
}
