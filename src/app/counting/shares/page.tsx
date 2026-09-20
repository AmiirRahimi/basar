import { CountingShell } from '@/components/counting/CountingShell';
import { SellerStorefrontOrders } from '@/components/counting/SellerStorefrontOrders';
import { ShareLinksBoard } from '@/components/counting/ShareLinksBoard';
import { listClothes, listPeople } from '@/actions/crud';
import { listProductShares } from '@/actions/share';
import { getSellerStorefrontOrders } from '@/actions/shop';
import { errorMessage, guardSession } from '@/lib/auth-guard';
import { personIsCustomer } from '@/lib/constants';
import { GATEWAY_FEE_PERCENT } from '@/lib/storefront';
import type { ProductShare, StorefrontOrderBoard } from '@/lib/types';

export default async function SharesPage() {
  const [clothesRes, sharesRes, peopleRes, ordersRes] = await Promise.all([
    listClothes(),
    listProductShares(),
    listPeople(),
    getSellerStorefrontOrders(),
  ]);
  guardSession(clothesRes, sharesRes, peopleRes, ordersRes);
  const clothes = Array.isArray(clothesRes.data) ? clothesRes.data : [];
  const shares = (Array.isArray(sharesRes.data) ? sharesRes.data : []) as ProductShare[];
  const customers = (Array.isArray(peopleRes.data) ? peopleRes.data : []).filter((row: Record<string, any>) =>
    personIsCustomer(row.role),
  );
  const board = (ordersRes.ok && ordersRes.data ? ordersRes.data : null) as StorefrontOrderBoard | null;

  return (
    <CountingShell
      title="لینک محصول"
      description="در طرح ویترین لینک بسازید تا مشتری همان مدل‌ها را ببیند، به سبد اضافه کند و پرداخت کند. سفارش‌ها و مبلغ در راه از درگاه پایین همین صفحه است."
      error={errorMessage(clothesRes) || errorMessage(sharesRes) || errorMessage(peopleRes) || errorMessage(ordersRes)}
    >
      <div className="space-y-6">
        <ShareLinksBoard clothes={clothes} shares={shares} customers={customers} />
        <SellerStorefrontOrders
          board={
            board || {
              orders: [],
              totals: { total: 0, platformFee: 0, sellerPayout: 0, count: 0 },
              feePercent: GATEWAY_FEE_PERCENT,
              isPlatformAdmin: false,
            }
          }
        />
      </div>
    </CountingShell>
  );
}
