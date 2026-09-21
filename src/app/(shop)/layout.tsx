import { getCartItems, resolveShopCatalog } from '@/actions/shop';
import { CartDock } from '@/components/shop/CartDock';
import { ShopCartProvider } from '@/components/shop/CartProvider';
import { ShareCookieGuard } from '@/components/shop/ShareCookieGuard';
import { ShopFooter, ShopHeader } from '@/components/shop/ShopChrome';

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const catalog = await resolveShopCatalog();
  const cart = await getCartItems(catalog);
  return (
    <div data-shop>
      <ShopCartProvider initialCart={cart} catalog={catalog}>
        <ShareCookieGuard />
        <ShopHeader />
        <main className="overflow-x-clip pb-24 md:pb-10">{children}</main>
        <ShopFooter />
        <CartDock />
      </ShopCartProvider>
    </div>
  );
}
