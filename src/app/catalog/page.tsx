import { ShopFooter, ShopHeader } from '@/components/shop/ShopChrome';
import { ProductCard } from '@/components/shop/ProductCard';
import { getCatalog } from '@/actions/shop';

export default async function CatalogPage() {
  const products = await getCatalog();
  return (
    <div dir="rtl">
      <ShopHeader />
      <div className="mx-auto max-w-6xl px-4 py-12">
        <h1 className="text-3xl font-semibold">کاتالوگ عمده</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          قیمت‌ها عمده هستند. امکان خرید تکی وجود ندارد. حداقل سفارش روی کارت هر مدل نوشته شده است.
        </p>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </div>
      <ShopFooter />
    </div>
  );
}
