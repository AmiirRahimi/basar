import { notFound } from 'next/navigation';
import { getSharedCatalog } from '@/actions/shop';
import { ProductCard } from '@/components/shop/ProductCard';
import { RememberShareToken } from '@/components/shop/RememberShareToken';
import { faNumber } from '@/lib/format';

export default async function SharedCatalogPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const shared = await getSharedCatalog(token);
  if (!shared.ok) notFound();

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:py-10 lg:px-6 lg:py-12">
      <RememberShareToken token={token} />
      <div>
        <p className="text-[11px] tracking-[0.28em] text-shop-saffron">انتخاب اختصاصی</p>
        <h1 className="mt-2 text-2xl font-semibold text-shop-ink sm:text-3xl">
          {shared.title || 'محصولات این لینک'}
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-shop-ink/65">
          {faNumber(shared.products.length)} مدل — بسته‌ها را به سبد اضافه کنید و از درگاه باسار پرداخت کنید.
        </p>
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
