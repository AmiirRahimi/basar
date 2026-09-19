'use client';

import { ShopPackPicker } from './ShopPackPicker';
import { useShopCart } from './CartProvider';
import type { CatalogProduct } from '@/lib/types';

export function ProductPackForm({ product }: { product: CatalogProduct }) {
  const { setProductPacks, pending, setDrawerOpen, items } = useShopCart();
  const line = items.find((item) => item.productId === product.id);
  const taken = line?.packs || [];
  const takenOrder = line?.takenOrder || [];
  return (
    <ShopPackPicker
      packSize={product.packSize}
      available={product.packs}
      taken={taken}
      takenOrder={takenOrder}
      unitPrice={product.wholesalePrice}
      minOrderQty={product.minOrderQty}
      pending={pending}
      onChange={async (packs, order) => {
        const wasEmpty = !taken.length;
        const res = await setProductPacks(product.id, packs, order);
        if (res.ok && wasEmpty && packs.length) setDrawerOpen(true);
      }}
    />
  );
}
