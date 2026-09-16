'use client';

import { setCartPacks, removeFromCart } from '@/actions/shop';
import { cartTotals, resolveCartLines } from '@/lib/shop-cart';
import type { CatalogProduct, WholesaleCartItem } from '@/lib/types';
import type { ClothPack } from '@/lib/packs';
import { createContext, useContext, useMemo, useState, useTransition } from 'react';

type CartContextValue = {
  items: WholesaleCartItem[];
  catalog: CatalogProduct[];
  lines: ReturnType<typeof resolveCartLines>;
  totals: ReturnType<typeof cartTotals>;
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  pending: boolean;
  message: string;
  setProductPacks: (productId: string, packs: ClothPack[], takenOrder: number[]) => Promise<{ ok: boolean; message: string }>;
  removeProduct: (productId: string) => Promise<void>;
};

const CartContext = createContext<CartContextValue | null>(null);

export function ShopCartProvider({
  initialCart,
  catalog,
  children,
}: {
  initialCart: WholesaleCartItem[];
  catalog: CatalogProduct[];
  children: React.ReactNode;
}) {
  const [items, setItems] = useState(initialCart);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [pending, start] = useTransition();
  const cartKey = JSON.stringify(initialCart);
  const [seen, setSeen] = useState(cartKey);
  if (seen !== cartKey) {
    setSeen(cartKey);
    setItems(initialCart);
  }

  const lines = useMemo(() => resolveCartLines(items, catalog), [items, catalog]);
  const totals = useMemo(() => cartTotals(lines), [lines]);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      catalog,
      lines,
      totals,
      drawerOpen,
      setDrawerOpen,
      pending,
      message,
      setProductPacks: (productId, packs, takenOrder) =>
        new Promise((resolve) => {
          start(async () => {
            const res = await setCartPacks(productId, packs, takenOrder);
            if (res.items) setItems(res.items);
            setMessage(res.message);
            resolve({ ok: res.ok, message: res.message });
          });
        }),
      removeProduct: (productId) =>
        new Promise((resolve) => {
          start(async () => {
            const res = await removeFromCart(productId);
            setItems(res.items);
            setMessage(res.message);
            resolve();
          });
        }),
    }),
    [items, catalog, lines, totals, drawerOpen, pending, message],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useShopCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useShopCart must be used inside ShopCartProvider');
  return ctx;
}
