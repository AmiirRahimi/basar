import { getCartItems, getCatalog } from '@/actions/shop';
import { CartDock } from '@/components/shop/CartDock';
import { ShopCartProvider } from '@/components/shop/CartProvider';
import { ShopFooter, ShopHeader } from '@/components/shop/ShopChrome';

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const catalog = await getCatalog();
  const cart = await getCartItems(catalog);
  return (
    <div data-shop>
      <ShopCartProvider initialCart={cart} catalog={catalog}>
        <ShopHeader />
        <main className="pb-10">{children}</main>
        <ShopFooter />
        <CartDock />
      </ShopCartProvider>
    </div>
  );
}
