import { ShopFooter, ShopHeader } from '@/components/shop/ShopChrome';
import { ProductCard } from '@/components/shop/ProductCard';
import { getCatalog } from '@/actions/shop';
import { Button } from '@/ui';
import Link from 'next/link';

export default async function HomePage() {
  const products = (await getCatalog()).slice(0, 4);

  return (
    <div dir="rtl">
      <ShopHeader />
      <section className="relative overflow-hidden bg-gradient-to-l from-warm-50 via-white to-gray-50">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
          <div className="space-y-6">
            <p className="text-sm tracking-widest text-primary">فروش فقط عمده</p>
            <h1 className="text-4xl font-semibold leading-tight md:text-5xl">
              پوشاک بازار، بسته‌های عمده برای فروشگاه‌ها
            </h1>
            <p className="max-w-md text-muted-foreground">
              کاتالوگ بنکداری با حداقل سفارش روی هر مدل. قیمت خرده‌فروشی نداریم — لات، کارتن و موجودی انبار.
            </p>
            <div className="flex gap-3">
              <Link href="/catalog">
                <Button size="lg">مشاهده کاتالوگ</Button>
              </Link>
              <Link href="/about">
                <Button size="lg" variant="outline">
                  شرایط همکاری
                </Button>
              </Link>
            </div>
          </div>
          <div
            className="h-[420px] rounded-3xl bg-cover bg-center shadow-xl"
            style={{
              backgroundImage:
                'url(https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?auto=format&fit=crop&w=1400&q=80)',
            }}
          />
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-semibold">مدل‌های آماده ارسال</h2>
            <p className="text-sm text-muted-foreground">موجودی از انبار شمارش بازار</p>
          </div>
          <Link href="/catalog" className="text-sm text-primary">
            همه مدل‌ها
          </Link>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>
      <ShopFooter />
    </div>
  );
}
