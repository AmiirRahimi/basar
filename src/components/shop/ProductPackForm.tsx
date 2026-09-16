'use client';

import { ShopPackPicker } from './ShopPackPicker';
import { useShopCart } from './CartProvider';
import type { CatalogProduct } from '@/lib/types';

export function ProductPackForm({ product }: { product: CatalogProduct }) {
  const { setProductPacks, pending, setDrawerOpen, items } = useShopCart();
  const taken = items.find((item) => item.productId === product.id)?.packs || [];
  return (
    <ShopPackPicker
      packSize={product.packSize}
      available={product.packs}
      taken={taken}
      unitPrice={product.wholesalePrice}
      minOrderQty={product.minOrderQty}
      pending={pending}
      onSubmit={async (packs, order) => {
        const res = await setProductPacks(product.id, packs, order);
        if (res.ok) setDrawerOpen(true);
      }}
    />
  );
}
