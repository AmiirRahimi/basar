import { getCatalog } from '@/actions/shop';
import { ProductCard } from '@/components/shop/ProductCard';
import { faNumber } from '@/lib/format';

export default async function CatalogPage() {
  const products = await getCatalog();
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 lg:px-6">
      <p className="text-[11px] tracking-[0.28em] text-shop-ink/40">ایندکس</p>
      <h1 className="mt-2 text-4xl font-semibold">همه مدل‌های انبار</h1>
      <p className="mt-3 max-w-2xl text-shop-ink/65">
        {faNumber(products.length)} مدل از جدول لباس. بدون فیلتر — برای غربال از صفحه جستجو استفاده کنید.
      </p>
      {products.length ? (
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <p className="mt-16 rounded-[2rem] border border-dashed border-shop-ink/15 px-6 py-20 text-center text-shop-ink/50">
          موجودی قابل فروش در انبار ثبت نشده است.
        </p>
      )}
    </div>
  );
}
