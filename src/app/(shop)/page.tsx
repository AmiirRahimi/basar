import { getCatalog } from '@/actions/shop';
import { collectionsFromCatalog } from '@/lib/catalog';
import { ProductCard } from '@/components/shop/ProductCard';
import { ShopButton } from '@/components/shop/ShopUi';
import { faNumber } from '@/lib/format';
import Link from 'next/link';

const HERO =
  'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1800&q=80';

export default async function HomePage() {
  const products = await getCatalog();
  const featured = products.slice(0, 8);
  const collections = collectionsFromCatalog(products);

  return (
    <div>
      <section data-shop-hero className="relative isolate min-h-[88vh] w-full overflow-hidden bg-shop-ink text-shop-bone">
        <div
          className="absolute inset-0 animate-shop-kenburns bg-cover bg-center opacity-45"
          style={{ backgroundImage: `url(${HERO})` }}
        />
        <div className="shop-grain absolute inset-0 bg-gradient-to-l from-shop-ink via-shop-ink/80 to-shop-ink/40" />
        <div className="relative mx-auto flex min-h-[88vh] max-w-7xl flex-col justify-end gap-8 px-4 py-16 pl-24 lg:px-6 lg:py-24 lg:pl-24">
          <p className="text-xs tracking-[0.42em] text-shop-saffron">فروش فقط عمده · فقط با بسته</p>
          <h1 className="max-w-4xl text-5xl font-semibold leading-[1.15] md:text-7xl">
            بازار،
            <span className="block text-shop-saffron">انبار پوشاک برای فروشگاه‌ها</span>
          </h1>
          <p className="max-w-xl text-lg leading-8 text-shop-bone/75">
            کارتن، بسته کامل و بسته ناقص از همان موجودی شمارش. قیمت خرده‌فروشی نداریم؛ سفارش روی فاکتور بنکداری ثبت می‌شود.
          </p>
          <div className="flex flex-wrap gap-3">
            <ShopButton href="/catalog" className="px-7 py-3 text-base">
              ایندکس کالا
            </ShopButton>
            <ShopButton href="/browse" variant="outline" className="border-white/20 bg-transparent text-shop-bone hover:bg-white/5">
              فیلتر مدل‌ها
            </ShopButton>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 lg:px-6">
        <div className="grid gap-px overflow-hidden rounded-[1.6rem] bg-shop-ink/10 md:grid-cols-3">
          {[
            ['بسته، نه عدد تکی', 'همان روش شمارش: بسته کامل در اولویت، بسته ناقص جداگانه.'],
            ['موجودی زنده انبار', 'کارت هر مدل از جدول لباس ساخته می‌شود؛ کارتن‌های مانده را می‌بینید.'],
            ['فاکتور شمارش', 'سفارش مهمان هم در پنل کارکنان به‌صورت فاکتور بسته‌ای ثبت می‌شود.'],
          ].map(([title, copy]) => (
            <div key={title} className="bg-shop-paper px-6 py-8">
              <p className="text-shop-saffron">{title}</p>
              <p className="mt-2 text-sm leading-7 text-shop-ink/70">{copy}</p>
            </div>
          ))}
        </div>
      </section>

      {collections.length ? (
        <section className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
          <div className="mb-6 flex items-end justify-between">
            <h2 className="text-3xl font-semibold">مجموعه‌ها</h2>
            <Link href="/browse" className="text-sm text-shop-ink/60">
              همه با فیلتر
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {collections.map((collection) => (
              <Link
                key={collection.id}
                href={`/browse?type=${encodeURIComponent(collection.id)}`}
                className="group relative h-48 overflow-hidden rounded-[1.4rem]"
              >
                <div className="absolute inset-0 bg-cover bg-center transition duration-700 group-hover:scale-105" style={{ backgroundImage: `url(${collection.image})` }} />
                <div className="absolute inset-0 bg-shop-ink/45" />
                <div className="relative flex h-full flex-col justify-end p-5 text-shop-bone">
                  <p className="text-xl font-medium">{collection.name}</p>
                  <p className="text-xs text-shop-bone/70">{faNumber(collection.count)} مدل</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mx-auto max-w-7xl px-4 py-12 lg:px-6">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <p className="text-[11px] tracking-[0.28em] text-shop-ink/40">نگاه اول</p>
            <h2 className="text-3xl font-semibold">مدل‌های آماده ارسال</h2>
          </div>
          <Link href="/catalog" className="text-sm text-shop-saffron">
            ایندکس کامل
          </Link>
        </div>
        {featured.length ? (
          <div className="flex gap-5 overflow-x-auto pb-4 snap-x">
            {featured.map((product) => (
              <div key={product.id} className="w-[min(100%,20rem)] shrink-0 snap-start">
                <ProductCard product={product} featured />
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-[1.6rem] border border-dashed border-shop-ink/15 px-6 py-16 text-center text-shop-ink/55">
            هنوز لباسی با موجودی در انبار نیست.
          </p>
        )}
      </section>
    </div>
  );
}
