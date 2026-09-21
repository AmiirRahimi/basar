import { notFound } from 'next/navigation';
import { getSharedCatalog } from '@/actions/shop';
import { ProductCard } from '@/components/shop/ProductCard';
import { RememberShareToken } from '@/components/shop/RememberShareToken';
import { ShopButton } from '@/components/shop/ShopUi';
import { faNumber } from '@/lib/format';
import { pageShare } from '@/lib/share-meta';
import { sharePath } from '@/lib/share-slug';

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const shared = await getSharedCatalog(token);
  if (!shared.ok) return pageShare({ title: 'لینک محصولات', description: 'ویترین اختصاصی فروشنده', url: sharePath(token) });
  const title = shared.title || (shared.showAll ? 'همه محصولات' : 'محصولات این لینک');
  return pageShare({
    title,
    description: `${faNumber(shared.products.length)} مدل از فروشنده`,
    url: sharePath(shared.slug || token),
  });
}

export default async function SharedCatalogPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const shared = await getSharedCatalog(token);
  if (!shared.ok) notFound();
  const catalogHref = shared.catalogSlug ? sharePath(shared.catalogSlug) : '';
  const showSubsetNav = !shared.showAll;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:py-10 lg:px-6 lg:py-12">
      <RememberShareToken token={shared.token || token} />
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] tracking-[0.28em] text-shop-saffron">
            {shared.showAll ? 'ویترین کامل' : 'انتخاب اختصاصی'}
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-shop-ink sm:text-3xl">
            {shared.title || (shared.showAll ? 'همه محصولات' : 'محصولات این لینک')}
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-shop-ink/65">
            {faNumber(shared.products.length)} مدل
            {shared.storeName ? ` · ${shared.storeName}` : ''} — بسته‌ها را به سبد اضافه کنید و از فروشگاه عمده سفارش دهید.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {showSubsetNav && catalogHref ? (
            <ShopButton href={catalogHref} variant="ink">
              همه محصولات این فروشنده
            </ShopButton>
          ) : null}
          <ShopButton href="/catalog" variant={showSubsetNav && catalogHref ? 'outline' : 'ink'}>
            فروشگاه آنلاین
          </ShopButton>
        </div>
      </div>

      {shared.products.length ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 sm:gap-6 xl:grid-cols-3">
          {shared.products.map((product) => (
            <ProductCard key={product.id} product={product} linkToDetail={false} />
          ))}
        </div>
      ) : (
        <p className="mt-10 rounded-2xl border border-dashed border-shop-ink/15 px-6 py-20 text-center text-shop-ink/50">
          موجودی این مدل‌ها فعلاً تمام شده است.
        </p>
      )}
    </div>
  );
}
