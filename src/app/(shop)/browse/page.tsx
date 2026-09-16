import { getCatalog } from '@/actions/shop';
import { filterCatalog } from '@/lib/catalog';
import { CatalogFilters } from '@/components/shop/CatalogFilters';
import { ProductCard } from '@/components/shop/ProductCard';
import { faNumber } from '@/lib/format';
import type { CatalogFilters as Filters } from '@/lib/types';
import { Suspense } from 'react';

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<Filters>;
}) {
  const params = await searchParams;
  const products = await getCatalog();
  const filtered = filterCatalog(products, params);
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 lg:px-6">
      <p className="text-[11px] tracking-[0.28em] text-shop-ink/40">غربال</p>
      <h1 className="mt-2 text-4xl font-semibold">مدل‌ها با فیلتر</h1>
      <p className="mt-3 text-shop-ink/65">
        {faNumber(filtered.length)} از {faNumber(products.length)} مدل
      </p>
      <div className="mt-8 grid gap-8 lg:grid-cols-[18rem_1fr]">
        <Suspense fallback={<div className="h-[28rem] animate-pulse rounded-[1.6rem] bg-shop-paper" />}>
          <CatalogFilters products={products} />
        </Suspense>
        <div>
          {filtered.length ? (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <p className="rounded-[2rem] border border-dashed border-shop-ink/15 px-6 py-20 text-center text-shop-ink/50">
              با این فیلتر مدلی پیدا نشد.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
