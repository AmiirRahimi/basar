import { getCartItems, getCatalog } from '@/actions/shop';
import { CartDock, CartDrawer } from '@/components/shop/CartDock';
import { ShopCartProvider } from '@/components/shop/CartProvider';
import { ShopFooter, ShopHeader } from '@/components/shop/ShopChrome';

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const catalog = await getCatalog();
  const cart = await getCartItems(catalog);
  return (
    <div data-shop>
      <ShopCartProvider initialCart={cart} catalog={catalog}>
        <ShopHeader />
        <main className="pb-28 lg:pb-10 lg:pl-24">{children}</main>
        <ShopFooter />
        <CartDock />
        <CartDrawer />
      </ShopCartProvider>
    </div>
  );
}
