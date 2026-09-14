import Link from 'next/link';
import { ShopFooter, ShopHeader } from '@/components/shop/ShopChrome';
import { getCartItems, getCatalog } from '@/actions/shop';
import { CartEditor } from '@/components/shop/CartEditor';
import { Button, EmptyState } from '@/ui';
import { toman } from '@/lib/format';

export default async function CartPage() {
  const [cart, catalog] = await Promise.all([getCartItems(), getCatalog()]);
  const lines = cart
    .map((item) => {
      const product = catalog.find((p) => p.id === item.productId);
      if (!product) return null;
      return { ...item, product, total: product.wholesalePrice * item.qty };
    })
    .filter(Boolean) as Array<{
    productId: string;
    qty: number;
    total: number;
    product: (typeof catalog)[0];
  }>;
  const sum = lines.reduce((s, l) => s + l.total, 0);

  return (
    <div dir="rtl">
      <ShopHeader />
      <div className="mx-auto max-w-4xl px-4 py-12">
        <h1 className="text-3xl font-semibold">سبد عمده</h1>
        {!lines.length ? (
          <EmptyState message="سبد خالی است. از کاتالوگ لات اضافه کنید." />
        ) : (
          <div className="mt-6 space-y-4">
            {lines.map((line) => (
              <div key={line.productId} className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-4">
                <div
                  className="h-20 w-16 rounded-lg bg-cover bg-center"
                  style={{ backgroundImage: `url(${line.product.image})` }}
                />
                <div className="flex-1">
                  <p className="font-medium">{line.product.name}</p>
                  <p className="text-sm text-muted-foreground">{toman(line.product.wholesalePrice)}</p>
                </div>
                <CartEditor
                  productId={line.productId}
                  qty={line.qty}
                  minOrderQty={line.product.minOrderQty}
                />
                <p className="w-32 text-left">{toman(line.total)}</p>
              </div>
            ))}
            <div className="flex items-center justify-between pt-4">
              <p className="text-lg">جمع: {toman(sum)}</p>
              <Link href="/checkout">
                <Button>ادامه سفارش</Button>
              </Link>
            </div>
          </div>
        )}
      </div>
      <ShopFooter />
    </div>
  );
}
