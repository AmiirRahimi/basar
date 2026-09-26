import { getCartItems, resolveShopCatalog } from '@/actions/shop';
import { getShopViewer } from '@/actions/shop-account';
import { CartDock } from '@/components/shop/CartDock';
import { ShopCartProvider } from '@/components/shop/CartProvider';
import { ShareCookieGuard } from '@/components/shop/ShareCookieGuard';
import { ShopFooter, ShopHeader } from '@/components/shop/ShopChrome';
import { ChatWidget } from '@/components/chat/ChatWidget';

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const [catalog, viewer] = await Promise.all([resolveShopCatalog(), getShopViewer()]);
  const cart = await getCartItems(catalog);
  return (
    <div data-shop>
      <ShopCartProvider initialCart={cart} catalog={catalog}>
        <ShareCookieGuard />
        <ShopHeader account={viewer} />
        <main className="overflow-x-clip pb-24 md:pb-10">{children}</main>
        <ShopFooter />
        <CartDock />
        <ChatWidget variant="shop" />
      </ShopCartProvider>
    </div>
  );
}
