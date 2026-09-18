import type { CatalogProduct } from '@/lib/types';
import { ProductCard } from './ProductCard';

export function ProductRail({ products, featured = false }: { products: CatalogProduct[]; featured?: boolean }) {
  return (
    <div className="flex gap-5 overflow-x-auto pb-4 snap-x [scrollbar-width:thin]">
      {products.map((product) => (
        <div key={product.id} className="w-[min(78vw,19.5rem)] shrink-0 snap-start sm:w-[min(48vw,20.5rem)] md:w-[min(42vw,21rem)]">
          <ProductCard product={product} featured={featured} />
        </div>
      ))}
    </div>
  );
}

export function ProductGrid({ products }: { products: CatalogProduct[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 sm:gap-6 xl:grid-cols-3">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
