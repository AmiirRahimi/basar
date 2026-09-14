import { notFound } from 'next/navigation';
import { ShopFooter, ShopHeader } from '@/components/shop/ShopChrome';
import { getCatalogProduct } from '@/actions/shop';
import { AddLotForm } from '@/components/shop/AddLotForm';
import { toman } from '@/lib/format';

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getCatalogProduct(id);
  if (!product) notFound();

  return (
    <div dir="rtl">
      <ShopHeader />
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-2">
        <div className="h-[520px] rounded-3xl bg-cover bg-center" style={{ backgroundImage: `url(${product.image})` }} />
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {product.category} · کد {product.code}
          </p>
          <h1 className="text-3xl font-semibold">{product.name}</h1>
          <p className="text-muted-foreground">{product.description}</p>
          <p className="text-2xl text-primary">{toman(product.wholesalePrice)}</p>
          <ul className="text-sm text-muted-foreground">
            <li>حداقل سفارش: {product.minOrderQty} عدد</li>
            <li>موجودی انبار: {product.count}</li>
            {product.size ? <li>سایز: {product.size}</li> : null}
            {product.color ? <li>رنگ: {product.color}</li> : null}
          </ul>
          <AddLotForm productId={product.id} minOrderQty={product.minOrderQty} />
        </div>
      </div>
      <ShopFooter />
    </div>
  );
}
