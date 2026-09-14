import Link from 'next/link';
import { toman } from '@/lib/format';
import type { CatalogProduct } from '@/lib/types';

export function ProductCard({ product }: { product: CatalogProduct }) {
  return (
    <Link
      href={`/product/${product.id}`}
      className="group overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div
        className="h-64 bg-cover bg-center"
        style={{ backgroundImage: `url(${product.image})` }}
      />
      <div className="space-y-2 p-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{product.category}</span>
          <span>کد {product.code}</span>
        </div>
        <h3 className="text-lg font-medium">{product.name}</h3>
        <p className="text-sm text-primary">{toman(product.wholesalePrice)} عمده</p>
        <span className="inline-block rounded-full bg-warm-50 px-2 py-1 text-xs">
          حداقل سفارش {product.minOrderQty} عدد
        </span>
      </div>
    </Link>
  );
}
