import type { Metadata } from 'next';
import { getCatalog } from '@/actions/shop';
import { filterCatalog } from '@/lib/catalog';
import { CatalogFilters } from '@/components/shop/CatalogFilters';
import { ProductCard } from '@/components/shop/ProductCard';
import { faNumber } from '@/lib/format';
import { pageShare } from '@/lib/share-meta';
import { absoluteUrl } from '@/lib/site';
import type { CatalogFilters as Filters } from '@/lib/types';
import { Suspense } from 'react';

export const metadata: Metadata = pageShare({
  title: 'کاتالوگ عمده جین پوش',
  description: 'همه مدل‌های عمده جین پوش: شلوار جین، کتان و پوشاک حجره بازار بزرگ تهران.',
  url: absoluteUrl('/catalog'),
});

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<Filters>;
}) {
  const params = await searchParams;
  const products = await getCatalog();
  const filtered = filterCatalog(products, params);
  const hasFilters = Boolean(
    params.q || params.type || params.style || params.size || params.color || params.minPrice || params.maxPrice || params.stock || params.sale || params.new,
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:py-10 lg:px-6 lg:py-12">
      <p className="text-[11px] tracking-[0.28em] text-shop-saffron">کاتالوگ عمده</p>
      <h1 className="mt-2 text-2xl font-semibold text-shop-ink sm:text-3xl md:text-4xl">همه محصولات عمده جین پوش</h1>
      <p className="mt-3 max-w-2xl text-sm text-shop-ink/65 sm:text-base">
        {faNumber(filtered.length)} از {faNumber(products.length)} مدل
        {hasFilters ? ' با فیلترهای انتخاب‌شده' : ' — با فیلتر قیمت، نوع و رنگ محدود کنید'}
      </p>
      <div className="mt-6 grid items-start gap-5 sm:mt-8 lg:mt-10 lg:grid-cols-[17.5rem_1fr] lg:gap-8">
        <Suspense fallback={<div className="h-[28rem] animate-pulse rounded-2xl bg-shop-paper" />}>
          <CatalogFilters products={products} />
        </Suspense>
        <div>
          {filtered.length ? (
            <div className="grid gap-4 sm:grid-cols-2 sm:gap-6 xl:grid-cols-3">
              {filtered.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <p className="rounded-2xl border border-dashed border-shop-ink/15 px-6 py-20 text-center text-shop-ink/50">
              با این فیلتر مدلی پیدا نشد.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
